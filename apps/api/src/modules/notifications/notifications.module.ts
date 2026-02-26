import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationEmailQueueService } from './notification-email-queue.service';
import { NotificationEmailWorkerService } from './notification-email-worker.service';
import { NotificationsService } from './notifications.service';
import {
    NotificationEmailJob,
    NotificationEmailJobSchema,
} from './schemas/notification-email-job.schema';
import {
    Notification,
    NotificationSchema,
} from './schemas/notification.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Notification.name, schema: NotificationSchema },
            {
                name: NotificationEmailJob.name,
                schema: NotificationEmailJobSchema,
            },
        ]),
        UsersModule,
        RoleAssignmentsModule,
    ],
    controllers: [NotificationsController],
    providers: [
        NotificationsService,
        NotificationEmailQueueService,
        NotificationEmailWorkerService,
    ],
    exports: [
        NotificationsService,
        NotificationEmailQueueService,
        NotificationEmailWorkerService,
    ],
})
export class NotificationsModule {}
