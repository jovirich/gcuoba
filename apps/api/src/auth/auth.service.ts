import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { UserDTO } from '@gcuoba/types';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AuditLogsService } from '../modules/audit-logs/audit-logs.service';
import { BranchesService } from '../modules/branches/branches.service';
import { ClassesService } from '../modules/classes/classes.service';
import { HousesService } from '../modules/houses/houses.service';
import { MembershipsService } from '../modules/memberships/memberships.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { ProfilesService } from '../modules/profiles/profiles.service';
import { RoleAssignmentsService } from '../modules/role-assignments/role-assignments.service';
import { LoginDto } from '../modules/users/dto/login.dto';
import { User } from '../modules/users/schemas/user.schema';
import { UsersService } from '../modules/users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PasswordResetToken } from './schemas/password-reset-token.schema';

const FORCED_GLOBAL_ADMIN_EMAILS = new Set(['ejovi.ekakitie@hotmail.com']);

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly profilesService: ProfilesService,
        private readonly membershipsService: MembershipsService,
        private readonly branchesService: BranchesService,
        private readonly classesService: ClassesService,
        private readonly housesService: HousesService,
        private readonly notificationsService: NotificationsService,
        private readonly auditLogsService: AuditLogsService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(PasswordResetToken.name)
        private readonly passwordResetTokenModel: Model<PasswordResetToken>,
    ) {}

    async getRegistrationOptions() {
        const [classes, branches, houses] = await Promise.all([
            this.classesService.findAll(),
            this.branchesService.findAll(),
            this.housesService.findAll(),
        ]);

        return { classes, branches, houses };
    }

    async register(
        dto: RegisterMemberDto,
    ): Promise<{ user: UserDTO; token: string }> {
        await this.ensureReferenceData(dto);

        const name = `${dto.firstName} ${dto.lastName}`.trim();
        let user: UserDTO;
        try {
            user = await this.usersService.create({
                name,
                email: dto.email,
                password: dto.password,
                phone: dto.phone,
            });
        } catch {
            throw new BadRequestException('Unable to register member');
        }

        await this.profilesService.upsert(user.id, {
            title: dto.title,
            firstName: dto.firstName,
            middleName: dto.middleName,
            lastName: dto.lastName,
            houseId: dto.houseId,
            privacyLevel: 'public_to_members',
            photoUrl: dto.photoUrl,
        });

        await this.membershipsService.updateClassMembership(user.id, {
            classId: dto.classId,
        });

        await this.membershipsService.requestBranchMembership(user.id, {
            branchId: dto.branchId,
            note: dto.note ?? 'Registration request',
        });

        await this.notificationsService.createForUser(user.id, {
            title: 'Registration received',
            message:
                'Your account has been created and is pending activation after branch approval.',
            type: 'action_required',
            metadata: {
                branchId: dto.branchId,
                classId: dto.classId,
            },
        });

        const reviewerIds = await this.resolveRegistrationReviewerIds(
            user.id,
            dto.branchId,
        );
        if (reviewerIds.length > 0) {
            await this.notificationsService.createForUsers(reviewerIds, {
                title: `New member registration: ${name}`,
                message: `${name} has completed registration and requested branch membership approval.`,
                type: 'action_required',
                metadata: {
                    userId: user.id,
                    branchId: dto.branchId,
                    classId: dto.classId,
                },
            });
        }

        await this.auditLogsService.record({
            actorUserId: user.id,
            action: 'auth.registered',
            resourceType: 'user',
            resourceId: user.id,
            scopeType: 'private',
            scopeId: null,
            metadata: {
                email: user.email,
                status: user.status,
                branchId: dto.branchId,
                classId: dto.classId,
            },
        });

        const token = await this.signToken(user);
        return { user, token };
    }

    async login(dto: LoginDto): Promise<{ user: UserDTO; token: string }> {
        const existing = await this.usersService.findByEmail(dto.email);
        if (!existing) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordHash = this.normalizeLegacyBcrypt(existing.passwordHash);
        const match = await bcrypt.compare(dto.password, passwordHash);
        if (!match) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const normalizedEmail = existing.email.toLowerCase();
        if (FORCED_GLOBAL_ADMIN_EMAILS.has(normalizedEmail)) {
            await this.roleAssignmentsService.ensureGlobalAdminForUser(
                existing._id.toString(),
            );
            await this.ensureExecutiveMemberFoundation(existing._id.toString());
            if (existing.status !== 'active') {
                existing.status = 'active';
                await existing.save();
            }
        }

        const user: UserDTO = {
            id: existing._id.toString(),
            name: existing.name,
            email: normalizedEmail,
            phone: existing.phone ?? null,
            status: existing.status,
        };

        await this.auditLogsService.record({
            actorUserId: user.id,
            action: 'auth.logged_in',
            resourceType: 'user',
            resourceId: user.id,
            scopeType: 'private',
            scopeId: null,
            metadata: {
                status: user.status,
            },
        });

        const token = await this.signToken(user);
        return { user, token };
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(email);

        await this.passwordResetTokenModel
            .deleteMany({ email, usedAt: null })
            .exec();

        let resetUrl: string | undefined;
        if (user) {
            const token = randomBytes(32).toString('hex');
            const tokenHash = this.hashToken(token);
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            await this.passwordResetTokenModel.create({
                email,
                tokenHash,
                expiresAt,
                usedAt: null,
            });

            const appUrl = this.resolveMailAppUrl();
            resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password/${token}?email=${encodeURIComponent(email)}`;

            await this.notificationsService.createForUser(user._id.toString(), {
                title: 'Password reset request',
                message:
                    'A password reset link has been generated for your account.',
                type: 'action_required',
                metadata: { resetUrl, expiresAt: expiresAt.toISOString() },
            });

            await this.auditLogsService.record({
                actorUserId: user._id.toString(),
                action: 'auth.password_reset_requested',
                resourceType: 'user',
                resourceId: user._id.toString(),
                scopeType: 'private',
                scopeId: null,
                metadata: { email },
            });
        }

        return {
            message:
                'If an account exists for this email, a reset link has been generated.',
            ...(process.env.NODE_ENV !== 'production' && resetUrl
                ? { resetUrl }
                : {}),
        };
    }

    async resetPassword(dto: ResetPasswordDto) {
        if (dto.password !== dto.passwordConfirmation) {
            throw new BadRequestException(
                'Password confirmation does not match',
            );
        }

        const email = dto.email.trim().toLowerCase();
        const tokenHash = this.hashToken(dto.token);
        const now = new Date();

        const resetToken = await this.passwordResetTokenModel
            .findOne({
                email,
                tokenHash,
                usedAt: null,
                expiresAt: { $gt: now },
            })
            .exec();

        if (!resetToken) {
            throw new BadRequestException('Reset token is invalid or expired');
        }

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new BadRequestException('Reset token is invalid or expired');
        }

        user.passwordHash = await bcrypt.hash(dto.password, 10);
        await user.save();

        resetToken.usedAt = now;
        await resetToken.save();

        await this.passwordResetTokenModel.deleteMany({
            email,
            usedAt: null,
        });

        await this.auditLogsService.record({
            actorUserId: user._id.toString(),
            action: 'auth.password_reset_completed',
            resourceType: 'user',
            resourceId: user._id.toString(),
            scopeType: 'private',
            scopeId: null,
            metadata: null,
        });

        return { message: 'Password has been reset successfully.' };
    }

    async updatePassword(userId: string, dto: UpdatePasswordDto) {
        if (dto.newPassword !== dto.newPasswordConfirmation) {
            throw new BadRequestException(
                'Password confirmation does not match',
            );
        }

        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new UnauthorizedException('Invalid user');
        }

        const currentHash = this.normalizeLegacyBcrypt(user.passwordHash);
        const match = await bcrypt.compare(dto.currentPassword, currentHash);
        if (!match) {
            throw new BadRequestException('Current password is incorrect');
        }

        user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        await user.save();

        await this.auditLogsService.record({
            actorUserId: userId,
            action: 'auth.password_changed',
            resourceType: 'user',
            resourceId: userId,
            scopeType: 'private',
            scopeId: null,
            metadata: null,
        });

        return { message: 'Password updated successfully.' };
    }

    async sendVerificationNotification(userId: string) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new UnauthorizedException('Invalid user');
        }

        if (user.emailVerifiedAt) {
            return { message: 'Email address is already verified.' };
        }

        const hash = createHash('sha1')
            .update(user.email.toLowerCase())
            .digest('hex');
        const appUrl = this.resolveMailAppUrl();
        const verifyUrl = `${appUrl.replace(/\/$/, '')}/verify-email/${user._id.toString()}/${hash}`;

        await this.notificationsService.createForUser(userId, {
            title: 'Verify your email',
            message: 'Email verification link has been generated.',
            type: 'action_required',
            metadata: { verifyUrl },
        });

        return {
            message: 'Verification link generated.',
            ...(process.env.NODE_ENV !== 'production' ? { verifyUrl } : {}),
        };
    }

    async verifyEmail(userId: string, hash: string) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new BadRequestException('Verification link is invalid');
        }

        const expected = createHash('sha1')
            .update(user.email.toLowerCase())
            .digest('hex');
        if (hash !== expected) {
            throw new BadRequestException('Verification link is invalid');
        }

        if (!user.emailVerifiedAt) {
            user.emailVerifiedAt = new Date();
            await user.save();
        }

        await this.auditLogsService.record({
            actorUserId: userId,
            action: 'auth.email_verified',
            resourceType: 'user',
            resourceId: userId,
            scopeType: 'private',
            scopeId: null,
            metadata: null,
        });

        return { message: 'Email verified successfully.' };
    }

    private normalizeLegacyBcrypt(hash: string): string {
        if (hash.startsWith('$2y$')) {
            return `$2b$${hash.slice(4)}`;
        }
        return hash;
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private resolveMailAppUrl(): string {
        const configured =
            this.configService.get<string>('MAIL_APP_URL') ??
            this.configService.get<string>('NEXTAUTH_URL') ??
            this.configService.get<string>('NEXT_PUBLIC_APP_URL') ??
            this.configService.get<string>('APP_URL') ??
            '';
        const normalizedConfigured = configured.trim().replace(/\/$/, '');
        const localPort =
            this.configService.get<string>('WEB_PORT') ??
            this.configService.get<string>('NEXT_WEB_PORT') ??
            '';
        const normalizedPort = localPort.trim();

        if (normalizedConfigured) {
            if (normalizedPort) {
                try {
                    const parsed = new URL(normalizedConfigured);
                    if (
                        parsed.hostname === 'localhost' ||
                        parsed.hostname === '127.0.0.1'
                    ) {
                        return `http://localhost:${normalizedPort}`;
                    }
                } catch {
                    return normalizedConfigured;
                }
            }
            return normalizedConfigured;
        }

        if (normalizedPort) {
            return `http://localhost:${normalizedPort}`;
        }

        return 'http://localhost';
    }

    private async ensureReferenceData(dto: RegisterMemberDto) {
        const [branchExists, classExists, houseExists] = await Promise.all([
            this.branchesService.exists(dto.branchId),
            this.classesService.exists(dto.classId),
            this.housesService.exists(dto.houseId),
        ]);

        if (!branchExists) {
            throw new BadRequestException('Selected branch does not exist');
        }
        if (!classExists) {
            throw new BadRequestException('Selected class does not exist');
        }
        if (!houseExists) {
            throw new BadRequestException('Selected house does not exist');
        }
    }

    private signToken(user: UserDTO) {
        return this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            status: user.status,
        });
    }

    private async resolveRegistrationReviewerIds(
        registeredUserId: string,
        branchId: string,
    ): Promise<string[]> {
        const [globalReviewers, branchReviewers, activeUserIds] =
            await Promise.all([
                this.roleAssignmentsService.listGlobalUserIds(),
                this.roleAssignmentsService.listBranchExecutiveUserIds(
                    branchId,
                ),
                this.usersService.listActiveUserIds(),
            ]);

        const activeSet = new Set(activeUserIds);

        return Array.from(
            new Set([...globalReviewers, ...branchReviewers]),
        ).filter(
            (userId) => userId !== registeredUserId && activeSet.has(userId),
        );
    }

    private async ensureExecutiveMemberFoundation(userId: string) {
        const [classMembership, branchMemberships] = await Promise.all([
            this.membershipsService.getClassMembership(userId),
            this.membershipsService.listBranchMemberships(userId),
        ]);

        if (!classMembership) {
            const classes = await this.classesService.findAll();
            const targetClass =
                classes.find((entry) => entry.status === 'active') ??
                classes[0];
            if (targetClass) {
                await this.membershipsService.updateClassMembership(userId, {
                    classId: targetClass.id,
                });
            }
        }

        const hasApprovedBranch = branchMemberships.some(
            (membership) => membership.status === 'approved',
        );
        if (!hasApprovedBranch) {
            const branches = await this.branchesService.findAll();
            const targetBranch = branches[0];
            if (targetBranch) {
                await this.membershipsService.ensureApprovedBranchMembership(
                    userId,
                    targetBranch.id,
                    userId,
                );
            }
        }
    }
}
