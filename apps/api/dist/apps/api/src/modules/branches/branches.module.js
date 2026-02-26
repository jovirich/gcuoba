"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const branch_schema_1 = require("./schemas/branch.schema");
const branches_controller_1 = require("./branches.controller");
const branches_service_1 = require("./branches.service");
let BranchesModule = class BranchesModule {
};
exports.BranchesModule = BranchesModule;
exports.BranchesModule = BranchesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: branch_schema_1.Branch.name, schema: branch_schema_1.BranchSchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
        ],
        controllers: [branches_controller_1.BranchesController],
        providers: [branches_service_1.BranchesService],
        exports: [branches_service_1.BranchesService],
    })
], BranchesModule);
//# sourceMappingURL=branches.module.js.map