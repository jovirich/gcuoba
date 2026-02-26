"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const configuration_1 = __importDefault(require("./config/configuration"));
const users_module_1 = require("./modules/users/users.module");
const branches_module_1 = require("./modules/branches/branches.module");
const roles_module_1 = require("./modules/roles/roles.module");
const auth_module_1 = require("./auth/auth.module");
const finance_module_1 = require("./modules/finance/finance.module");
const welfare_module_1 = require("./modules/welfare/welfare.module");
const classes_module_1 = require("./modules/classes/classes.module");
const profiles_module_1 = require("./modules/profiles/profiles.module");
const memberships_module_1 = require("./modules/memberships/memberships.module");
const role_assignments_module_1 = require("./modules/role-assignments/role-assignments.module");
const branch_executive_module_1 = require("./modules/branch-executive/branch-executive.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const announcements_module_1 = require("./modules/announcements/announcements.module");
const events_module_1 = require("./modules/events/events.module");
const houses_module_1 = require("./modules/houses/houses.module");
const countries_module_1 = require("./modules/countries/countries.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const documents_module_1 = require("./modules/documents/documents.module");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const admin_members_module_1 = require("./modules/admin-members/admin-members.module");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const active_user_guard_1 = require("./auth/active-user.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [configuration_1.default] }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('database.uri'),
                }),
            }),
            users_module_1.UsersModule,
            branches_module_1.BranchesModule,
            roles_module_1.RolesModule,
            auth_module_1.AuthModule,
            finance_module_1.FinanceModule,
            welfare_module_1.WelfareModule,
            classes_module_1.ClassesModule,
            profiles_module_1.ProfilesModule,
            memberships_module_1.MembershipsModule,
            role_assignments_module_1.RoleAssignmentsModule,
            admin_members_module_1.AdminMembersModule,
            branch_executive_module_1.BranchExecutiveModule,
            dashboard_module_1.DashboardModule,
            announcements_module_1.AnnouncementsModule,
            events_module_1.EventsModule,
            houses_module_1.HousesModule,
            countries_module_1.CountriesModule,
            notifications_module_1.NotificationsModule,
            documents_module_1.DocumentsModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: active_user_guard_1.ActiveUserGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map