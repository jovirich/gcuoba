"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleAssignmentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const role_assignments_service_1 = require("./role-assignments.service");
const role_assignment_schema_1 = require("./schemas/role-assignment.schema");
const role_schema_1 = require("../roles/schemas/role.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const role_assignments_controller_1 = require("./role-assignments.controller");
const memberships_module_1 = require("../memberships/memberships.module");
let RoleAssignmentsModule = class RoleAssignmentsModule {
};
exports.RoleAssignmentsModule = RoleAssignmentsModule;
exports.RoleAssignmentsModule = RoleAssignmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            memberships_module_1.MembershipsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: role_assignment_schema_1.RoleAssignment.name, schema: role_assignment_schema_1.RoleAssignmentSchema },
                { name: role_schema_1.Role.name, schema: role_schema_1.RoleSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [role_assignments_controller_1.RoleAssignmentsController],
        providers: [role_assignments_service_1.RoleAssignmentsService],
        exports: [role_assignments_service_1.RoleAssignmentsService],
    })
], RoleAssignmentsModule);
//# sourceMappingURL=role-assignments.module.js.map