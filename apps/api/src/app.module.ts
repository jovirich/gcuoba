import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WelfareModule } from './modules/welfare/welfare.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { RoleAssignmentsModule } from './modules/role-assignments/role-assignments.module';
import { BranchExecutiveModule } from './modules/branch-executive/branch-executive.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { EventsModule } from './modules/events/events.module';
import { HousesModule } from './modules/houses/houses.module';
import { CountriesModule } from './modules/countries/countries.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AdminMembersModule } from './modules/admin-members/admin-members.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ActiveUserGuard } from './auth/active-user.guard';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                uri: config.get<string>('database.uri'),
            }),
        }),
        UsersModule,
        BranchesModule,
        RolesModule,
        AuthModule,
        FinanceModule,
        WelfareModule,
        ClassesModule,
        ProfilesModule,
        MembershipsModule,
        RoleAssignmentsModule,
        AdminMembersModule,
        BranchExecutiveModule,
        DashboardModule,
        AnnouncementsModule,
        EventsModule,
        HousesModule,
        CountriesModule,
        NotificationsModule,
        DocumentsModule,
        AuditLogsModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: ActiveUserGuard,
        },
    ],
})
export class AppModule {}
