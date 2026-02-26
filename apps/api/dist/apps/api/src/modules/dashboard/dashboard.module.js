"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const dashboard_controller_1 = require("./dashboard.controller");
const dashboard_service_1 = require("./dashboard.service");
const users_module_1 = require("../users/users.module");
const branches_module_1 = require("../branches/branches.module");
const memberships_module_1 = require("../memberships/memberships.module");
const finance_module_1 = require("../finance/finance.module");
const welfare_module_1 = require("../welfare/welfare.module");
const announcement_schema_1 = require("./schemas/announcement.schema");
const event_schema_1 = require("./schemas/event.schema");
let DashboardModule = class DashboardModule {
};
exports.DashboardModule = DashboardModule;
exports.DashboardModule = DashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            branches_module_1.BranchesModule,
            memberships_module_1.MembershipsModule,
            finance_module_1.FinanceModule,
            welfare_module_1.WelfareModule,
            mongoose_1.MongooseModule.forFeature([
                { name: announcement_schema_1.Announcement.name, schema: announcement_schema_1.AnnouncementSchema },
                { name: event_schema_1.DashboardEvent.name, schema: event_schema_1.EventSchema },
            ]),
        ],
        controllers: [dashboard_controller_1.DashboardController],
        providers: [dashboard_service_1.DashboardService],
    })
], DashboardModule);
//# sourceMappingURL=dashboard.module.js.map