"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const audit_logs_service_1 = require("../modules/audit-logs/audit-logs.service");
const branches_service_1 = require("../modules/branches/branches.service");
const classes_service_1 = require("../modules/classes/classes.service");
const houses_service_1 = require("../modules/houses/houses.service");
const memberships_service_1 = require("../modules/memberships/memberships.service");
const notifications_service_1 = require("../modules/notifications/notifications.service");
const profiles_service_1 = require("../modules/profiles/profiles.service");
const role_assignments_service_1 = require("../modules/role-assignments/role-assignments.service");
const user_schema_1 = require("../modules/users/schemas/user.schema");
const users_service_1 = require("../modules/users/users.service");
const password_reset_token_schema_1 = require("./schemas/password-reset-token.schema");
const FORCED_GLOBAL_ADMIN_EMAILS = new Set(['ejovi.ekakitie@hotmail.com']);
let AuthService = class AuthService {
    usersService;
    profilesService;
    membershipsService;
    branchesService;
    classesService;
    housesService;
    notificationsService;
    auditLogsService;
    roleAssignmentsService;
    jwtService;
    configService;
    userModel;
    passwordResetTokenModel;
    constructor(usersService, profilesService, membershipsService, branchesService, classesService, housesService, notificationsService, auditLogsService, roleAssignmentsService, jwtService, configService, userModel, passwordResetTokenModel) {
        this.usersService = usersService;
        this.profilesService = profilesService;
        this.membershipsService = membershipsService;
        this.branchesService = branchesService;
        this.classesService = classesService;
        this.housesService = housesService;
        this.notificationsService = notificationsService;
        this.auditLogsService = auditLogsService;
        this.roleAssignmentsService = roleAssignmentsService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.userModel = userModel;
        this.passwordResetTokenModel = passwordResetTokenModel;
    }
    async getRegistrationOptions() {
        const [classes, branches, houses] = await Promise.all([
            this.classesService.findAll(),
            this.branchesService.findAll(),
            this.housesService.findAll(),
        ]);
        return { classes, branches, houses };
    }
    async register(dto) {
        await this.ensureReferenceData(dto);
        const name = `${dto.firstName} ${dto.lastName}`.trim();
        let user;
        try {
            user = await this.usersService.create({
                name,
                email: dto.email,
                password: dto.password,
                phone: dto.phone,
            });
        }
        catch {
            throw new common_1.BadRequestException('Unable to register member');
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
            message: 'Your account has been created and is pending activation after branch approval.',
            type: 'action_required',
            metadata: {
                branchId: dto.branchId,
                classId: dto.classId,
            },
        });
        const reviewerIds = await this.resolveRegistrationReviewerIds(user.id, dto.branchId);
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
    async login(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (!existing) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordHash = this.normalizeLegacyBcrypt(existing.passwordHash);
        const match = await bcrypt.compare(dto.password, passwordHash);
        if (!match) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const normalizedEmail = existing.email.toLowerCase();
        if (FORCED_GLOBAL_ADMIN_EMAILS.has(normalizedEmail)) {
            await this.roleAssignmentsService.ensureGlobalAdminForUser(existing._id.toString());
            await this.ensureExecutiveMemberFoundation(existing._id.toString());
            if (existing.status !== 'active') {
                existing.status = 'active';
                await existing.save();
            }
        }
        const user = {
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
    async forgotPassword(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(email);
        await this.passwordResetTokenModel
            .deleteMany({ email, usedAt: null })
            .exec();
        let resetUrl;
        if (user) {
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
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
                message: 'A password reset link has been generated for your account.',
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
            message: 'If an account exists for this email, a reset link has been generated.',
            ...(process.env.NODE_ENV !== 'production' && resetUrl
                ? { resetUrl }
                : {}),
        };
    }
    async resetPassword(dto) {
        if (dto.password !== dto.passwordConfirmation) {
            throw new common_1.BadRequestException('Password confirmation does not match');
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
            throw new common_1.BadRequestException('Reset token is invalid or expired');
        }
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.BadRequestException('Reset token is invalid or expired');
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
    async updatePassword(userId, dto) {
        if (dto.newPassword !== dto.newPasswordConfirmation) {
            throw new common_1.BadRequestException('Password confirmation does not match');
        }
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid user');
        }
        const currentHash = this.normalizeLegacyBcrypt(user.passwordHash);
        const match = await bcrypt.compare(dto.currentPassword, currentHash);
        if (!match) {
            throw new common_1.BadRequestException('Current password is incorrect');
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
    async sendVerificationNotification(userId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid user');
        }
        if (user.emailVerifiedAt) {
            return { message: 'Email address is already verified.' };
        }
        const hash = (0, crypto_1.createHash)('sha1')
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
    async verifyEmail(userId, hash) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.BadRequestException('Verification link is invalid');
        }
        const expected = (0, crypto_1.createHash)('sha1')
            .update(user.email.toLowerCase())
            .digest('hex');
        if (hash !== expected) {
            throw new common_1.BadRequestException('Verification link is invalid');
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
    normalizeLegacyBcrypt(hash) {
        if (hash.startsWith('$2y$')) {
            return `$2b$${hash.slice(4)}`;
        }
        return hash;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    resolveMailAppUrl() {
        const configured = this.configService.get('MAIL_APP_URL') ??
            this.configService.get('NEXTAUTH_URL') ??
            this.configService.get('NEXT_PUBLIC_APP_URL') ??
            this.configService.get('APP_URL') ??
            '';
        const normalizedConfigured = configured.trim().replace(/\/$/, '');
        const localPort = this.configService.get('WEB_PORT') ??
            this.configService.get('NEXT_WEB_PORT') ??
            '';
        const normalizedPort = localPort.trim();
        if (normalizedConfigured) {
            if (normalizedPort) {
                try {
                    const parsed = new URL(normalizedConfigured);
                    if (parsed.hostname === 'localhost' ||
                        parsed.hostname === '127.0.0.1') {
                        return `http://localhost:${normalizedPort}`;
                    }
                }
                catch {
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
    async ensureReferenceData(dto) {
        const [branchExists, classExists, houseExists] = await Promise.all([
            this.branchesService.exists(dto.branchId),
            this.classesService.exists(dto.classId),
            this.housesService.exists(dto.houseId),
        ]);
        if (!branchExists) {
            throw new common_1.BadRequestException('Selected branch does not exist');
        }
        if (!classExists) {
            throw new common_1.BadRequestException('Selected class does not exist');
        }
        if (!houseExists) {
            throw new common_1.BadRequestException('Selected house does not exist');
        }
    }
    signToken(user) {
        return this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            status: user.status,
        });
    }
    async resolveRegistrationReviewerIds(registeredUserId, branchId) {
        const [globalReviewers, branchReviewers, activeUserIds] = await Promise.all([
            this.roleAssignmentsService.listGlobalUserIds(),
            this.roleAssignmentsService.listBranchExecutiveUserIds(branchId),
            this.usersService.listActiveUserIds(),
        ]);
        const activeSet = new Set(activeUserIds);
        return Array.from(new Set([...globalReviewers, ...branchReviewers])).filter((userId) => userId !== registeredUserId && activeSet.has(userId));
    }
    async ensureExecutiveMemberFoundation(userId) {
        const [classMembership, branchMemberships] = await Promise.all([
            this.membershipsService.getClassMembership(userId),
            this.membershipsService.listBranchMemberships(userId),
        ]);
        if (!classMembership) {
            const classes = await this.classesService.findAll();
            const targetClass = classes.find((entry) => entry.status === 'active') ??
                classes[0];
            if (targetClass) {
                await this.membershipsService.updateClassMembership(userId, {
                    classId: targetClass.id,
                });
            }
        }
        const hasApprovedBranch = branchMemberships.some((membership) => membership.status === 'approved');
        if (!hasApprovedBranch) {
            const branches = await this.branchesService.findAll();
            const targetBranch = branches[0];
            if (targetBranch) {
                await this.membershipsService.ensureApprovedBranchMembership(userId, targetBranch.id, userId);
            }
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(11, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(12, (0, mongoose_1.InjectModel)(password_reset_token_schema_1.PasswordResetToken.name)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        profiles_service_1.ProfilesService,
        memberships_service_1.MembershipsService,
        branches_service_1.BranchesService,
        classes_service_1.ClassesService,
        houses_service_1.HousesService,
        notifications_service_1.NotificationsService,
        audit_logs_service_1.AuditLogsService,
        role_assignments_service_1.RoleAssignmentsService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mongoose_2.Model,
        mongoose_2.Model])
], AuthService);
//# sourceMappingURL=auth.service.js.map