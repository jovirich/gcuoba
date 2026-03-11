import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserDTO } from '@gcuoba/types';
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
export declare class AuthService {
    private readonly usersService;
    private readonly profilesService;
    private readonly membershipsService;
    private readonly branchesService;
    private readonly classesService;
    private readonly housesService;
    private readonly notificationsService;
    private readonly auditLogsService;
    private readonly roleAssignmentsService;
    private readonly jwtService;
    private readonly configService;
    private readonly userModel;
    private readonly passwordResetTokenModel;
    constructor(usersService: UsersService, profilesService: ProfilesService, membershipsService: MembershipsService, branchesService: BranchesService, classesService: ClassesService, housesService: HousesService, notificationsService: NotificationsService, auditLogsService: AuditLogsService, roleAssignmentsService: RoleAssignmentsService, jwtService: JwtService, configService: ConfigService, userModel: Model<User>, passwordResetTokenModel: Model<PasswordResetToken>);
    getRegistrationOptions(): Promise<{
        classes: import("@gcuoba/types").ClassSetDTO[];
        branches: import("@gcuoba/types").BranchDTO[];
        houses: import("@gcuoba/types").HouseDTO[];
    }>;
    register(dto: RegisterMemberDto): Promise<{
        user: UserDTO;
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: UserDTO;
        token: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        resetUrl?: string | undefined;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updatePassword(userId: string, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    sendVerificationNotification(userId: string): Promise<{
        verifyUrl?: string | undefined;
        message: string;
    }>;
    verifyEmail(userId: string, hash: string): Promise<{
        message: string;
    }>;
    private normalizeLegacyBcrypt;
    private hashToken;
    private resolveMailAppUrl;
    private ensureReferenceData;
    private signToken;
    private resolveRegistrationReviewerIds;
    private ensureExecutiveMemberFoundation;
}
