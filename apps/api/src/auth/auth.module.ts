import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditLogsModule } from '../modules/audit-logs/audit-logs.module';
import { BranchesModule } from '../modules/branches/branches.module';
import { ClassesModule } from '../modules/classes/classes.module';
import { HousesModule } from '../modules/houses/houses.module';
import { MembershipsModule } from '../modules/memberships/memberships.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ProfilesModule } from '../modules/profiles/profiles.module';
import { RoleAssignmentsModule } from '../modules/role-assignments/role-assignments.module';
import { UsersModule } from '../modules/users/users.module';
import { User, UserSchema } from '../modules/users/schemas/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import {
    PasswordResetToken,
    PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';

@Module({
    imports: [
        UsersModule,
        ProfilesModule,
        MembershipsModule,
        BranchesModule,
        ClassesModule,
        HousesModule,
        NotificationsModule,
        AuditLogsModule,
        RoleAssignmentsModule,
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
        ]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET') || 'dev-secret',
                signOptions: { expiresIn: '1d' },
            }),
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
