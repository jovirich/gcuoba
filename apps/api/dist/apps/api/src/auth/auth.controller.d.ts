import { AuthService } from './auth.service';
import { LoginDto } from '../modules/users/dto/login.dto';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import type { AuthenticatedUser } from './authenticated-user.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getRegistrationOptions(): Promise<{
        classes: import("@gcuoba/types").ClassSetDTO[];
        branches: import("@gcuoba/types").BranchDTO[];
        houses: import("@gcuoba/types").HouseDTO[];
    }>;
    register(dto: RegisterMemberDto): Promise<{
        user: import("@gcuoba/types").UserDTO;
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: import("@gcuoba/types").UserDTO;
        token: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        resetUrl?: string | undefined;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updatePassword(user: AuthenticatedUser, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    sendVerificationEmail(user: AuthenticatedUser): Promise<{
        verifyUrl?: string | undefined;
        message: string;
    }>;
    verifyEmail(userId: string, hash: string): Promise<{
        message: string;
    }>;
}
