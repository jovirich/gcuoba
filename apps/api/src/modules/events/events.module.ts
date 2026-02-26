import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DashboardEvent, EventSchema } from '../dashboard/schemas/event.schema';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { UsersModule } from '../users/users.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DashboardEvent.name, schema: EventSchema },
        ]),
        RoleAssignmentsModule,
        MembershipsModule,
        UsersModule,
        NotificationsModule,
        AuditLogsModule,
    ],
    controllers: [EventsController],
    providers: [EventsService],
})
export class EventsModule {}
