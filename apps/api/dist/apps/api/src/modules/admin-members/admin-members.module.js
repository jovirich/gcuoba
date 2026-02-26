"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminMembersModule = void 0;
const common_1 = require("@nestjs/common");
const admin_members_controller_1 = require("./admin-members.controller");
const admin_members_service_1 = require("./admin-members.service");
const users_module_1 = require("../users/users.module");
const profiles_module_1 = require("../profiles/profiles.module");
const memberships_module_1 = require("../memberships/memberships.module");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
let AdminMembersModule = class AdminMembersModule {
};
exports.AdminMembersModule = AdminMembersModule;
exports.AdminMembersModule = AdminMembersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            profiles_module_1.ProfilesModule,
            memberships_module_1.MembershipsModule,
            role_assignments_module_1.RoleAssignmentsModule,
        ],
        controllers: [admin_members_controller_1.AdminMembersController],
        providers: [admin_members_service_1.AdminMembersService],
    })
], AdminMembersModule);
//# sourceMappingURL=admin-members.module.js.map