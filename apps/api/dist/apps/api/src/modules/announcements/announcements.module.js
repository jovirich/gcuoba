"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
const announcement_schema_1 = require("../dashboard/schemas/announcement.schema");
const memberships_module_1 = require("../memberships/memberships.module");
const notifications_module_1 = require("../notifications/notifications.module");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const users_module_1 = require("../users/users.module");
const announcements_controller_1 = require("./announcements.controller");
const announcements_service_1 = require("./announcements.service");
let AnnouncementsModule = class AnnouncementsModule {
};
exports.AnnouncementsModule = AnnouncementsModule;
exports.AnnouncementsModule = AnnouncementsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: announcement_schema_1.Announcement.name, schema: announcement_schema_1.AnnouncementSchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
            memberships_module_1.MembershipsModule,
            users_module_1.UsersModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [announcements_controller_1.AnnouncementsController],
        providers: [announcements_service_1.AnnouncementsService],
    })
], AnnouncementsModule);
//# sourceMappingURL=announcements.module.js.map