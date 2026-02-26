"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchExecutiveModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const branch_executive_controller_1 = require("./branch-executive.controller");
const branch_executive_service_1 = require("./branch-executive.service");
const branch_schema_1 = require("../branches/schemas/branch.schema");
const branch_membership_schema_1 = require("../memberships/schemas/branch-membership.schema");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const users_module_1 = require("../users/users.module");
const notifications_module_1 = require("../notifications/notifications.module");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
const memberships_module_1 = require("../memberships/memberships.module");
const role_schema_1 = require("../roles/schemas/role.schema");
const role_assignment_schema_1 = require("../role-assignments/schemas/role-assignment.schema");
let BranchExecutiveModule = class BranchExecutiveModule {
};
exports.BranchExecutiveModule = BranchExecutiveModule;
exports.BranchExecutiveModule = BranchExecutiveModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: branch_schema_1.Branch.name, schema: branch_schema_1.BranchSchema },
                { name: branch_membership_schema_1.BranchMembership.name, schema: branch_membership_schema_1.BranchMembershipSchema },
                { name: role_schema_1.Role.name, schema: role_schema_1.RoleSchema },
                { name: role_assignment_schema_1.RoleAssignment.name, schema: role_assignment_schema_1.RoleAssignmentSchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
            memberships_module_1.MembershipsModule,
            users_module_1.UsersModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [branch_executive_controller_1.BranchExecutiveController],
        providers: [branch_executive_service_1.BranchExecutiveService],
    })
], BranchExecutiveModule);
//# sourceMappingURL=branch-executive.module.js.map