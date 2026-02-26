import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../modules/users/dto/login.dto';
import { Public } from './public.decorator';
import { RegisterMemberDto } from './dto/register-member.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './authenticated-user.interface';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('registration/options')
    @Public()
    getRegistrationOptions() {
        return this.authService.getRegistrationOptions();
    }

    @Post('register')
    @Public()
    register(@Body() dto: RegisterMemberDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @Public()
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('forgot-password')
    @Public()
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @Public()
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    @Put('password')
    updatePassword(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: UpdatePasswordDto,
    ) {
        return this.authService.updatePassword(user.id, dto);
    }

    @Post('email/verification-notification')
    sendVerificationEmail(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.sendVerificationNotification(user.id);
    }

    @Get('verify-email/:userId/:hash')
    @Public()
    verifyEmail(@Param('userId') userId: string, @Param('hash') hash: string) {
        return this.authService.verifyEmail(userId, hash);
    }
}
