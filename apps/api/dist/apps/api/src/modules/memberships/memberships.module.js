"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const memberships_controller_1 = require("./memberships.controller");
const memberships_service_1 = require("./memberships.service");
const branch_membership_schema_1 = require("./schemas/branch-membership.schema");
const class_membership_schema_1 = require("./schemas/class-membership.schema");
let MembershipsModule = class MembershipsModule {
};
exports.MembershipsModule = MembershipsModule;
exports.MembershipsModule = MembershipsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: branch_membership_schema_1.BranchMembership.name, schema: branch_membership_schema_1.BranchMembershipSchema },
                { name: class_membership_schema_1.ClassMembership.name, schema: class_membership_schema_1.ClassMembershipSchema },
            ]),
        ],
        controllers: [memberships_controller_1.MembershipsController],
        providers: [memberships_service_1.MembershipsService],
        exports: [memberships_service_1.MembershipsService],
    })
], MembershipsModule);
//# sourceMappingURL=memberships.module.js.map