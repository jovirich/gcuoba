"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const memberships_module_1 = require("../memberships/memberships.module");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const role_assignment_schema_1 = require("../role-assignments/schemas/role-assignment.schema");
const role_schema_1 = require("./schemas/role.schema");
const role_feature_schema_1 = require("./schemas/role-feature.schema");
const roles_controller_1 = require("./roles.controller");
const roles_service_1 = require("./roles.service");
let RolesModule = class RolesModule {
};
exports.RolesModule = RolesModule;
exports.RolesModule = RolesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: role_schema_1.Role.name, schema: role_schema_1.RoleSchema },
                { name: role_feature_schema_1.RoleFeature.name, schema: role_feature_schema_1.RoleFeatureSchema },
                { name: role_assignment_schema_1.RoleAssignment.name, schema: role_assignment_schema_1.RoleAssignmentSchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
            memberships_module_1.MembershipsModule,
        ],
        controllers: [roles_controller_1.RolesController],
        providers: [roles_service_1.RolesService],
        exports: [roles_service_1.RolesService],
    })
], RolesModule);
//# sourceMappingURL=roles.module.js.map