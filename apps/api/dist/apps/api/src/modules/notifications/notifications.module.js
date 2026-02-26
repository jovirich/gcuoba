"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const users_module_1 = require("../users/users.module");
const notifications_controller_1 = require("./notifications.controller");
const notification_email_queue_service_1 = require("./notification-email-queue.service");
const notification_email_worker_service_1 = require("./notification-email-worker.service");
const notifications_service_1 = require("./notifications.service");
const notification_email_job_schema_1 = require("./schemas/notification-email-job.schema");
const notification_schema_1 = require("./schemas/notification.schema");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: notification_schema_1.Notification.name, schema: notification_schema_1.NotificationSchema },
                {
                    name: notification_email_job_schema_1.NotificationEmailJob.name,
                    schema: notification_email_job_schema_1.NotificationEmailJobSchema,
                },
            ]),
            users_module_1.UsersModule,
            role_assignments_module_1.RoleAssignmentsModule,
        ],
        controllers: [notifications_controller_1.NotificationsController],
        providers: [
            notifications_service_1.NotificationsService,
            notification_email_queue_service_1.NotificationEmailQueueService,
            notification_email_worker_service_1.NotificationEmailWorkerService,
        ],
        exports: [
            notifications_service_1.NotificationsService,
            notification_email_queue_service_1.NotificationEmailQueueService,
            notification_email_worker_service_1.NotificationEmailWorkerService,
        ],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map