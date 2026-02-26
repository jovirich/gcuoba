import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import {
    Announcement,
    AnnouncementSchema,
} from '../dashboard/schemas/announcement.schema';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { UsersModule } from '../users/users.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Announcement.name, schema: AnnouncementSchema },
        ]),
        RoleAssignmentsModule,
        MembershipsModule,
        UsersModule,
        NotificationsModule,
        AuditLogsModule,
    ],
    controllers: [AnnouncementsController],
    providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
