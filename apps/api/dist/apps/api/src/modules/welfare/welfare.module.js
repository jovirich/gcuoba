"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WelfareModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const welfare_controller_1 = require("./welfare.controller");
const welfare_service_1 = require("./welfare.service");
const welfare_category_schema_1 = require("./schemas/welfare-category.schema");
const welfare_case_schema_1 = require("./schemas/welfare-case.schema");
const welfare_contribution_schema_1 = require("./schemas/welfare-contribution.schema");
const welfare_payout_schema_1 = require("./schemas/welfare-payout.schema");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const memberships_module_1 = require("../memberships/memberships.module");
const branches_module_1 = require("../branches/branches.module");
const classes_module_1 = require("../classes/classes.module");
const users_module_1 = require("../users/users.module");
const notifications_module_1 = require("../notifications/notifications.module");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
let WelfareModule = class WelfareModule {
};
exports.WelfareModule = WelfareModule;
exports.WelfareModule = WelfareModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: welfare_category_schema_1.WelfareCategory.name, schema: welfare_category_schema_1.WelfareCategorySchema },
                { name: welfare_case_schema_1.WelfareCase.name, schema: welfare_case_schema_1.WelfareCaseSchema },
                {
                    name: welfare_contribution_schema_1.WelfareContribution.name,
                    schema: welfare_contribution_schema_1.WelfareContributionSchema,
                },
                { name: welfare_payout_schema_1.WelfarePayout.name, schema: welfare_payout_schema_1.WelfarePayoutSchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
            memberships_module_1.MembershipsModule,
            branches_module_1.BranchesModule,
            classes_module_1.ClassesModule,
            users_module_1.UsersModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [welfare_controller_1.WelfareController],
        providers: [welfare_service_1.WelfareService],
        exports: [welfare_service_1.WelfareService],
    })
], WelfareModule);
//# sourceMappingURL=welfare.module.js.map