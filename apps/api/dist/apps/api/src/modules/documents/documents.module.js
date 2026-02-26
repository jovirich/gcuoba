"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const branches_module_1 = require("../branches/branches.module");
const classes_module_1 = require("../classes/classes.module");
const memberships_module_1 = require("../memberships/memberships.module");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
const documents_controller_1 = require("./documents.controller");
const documents_service_1 = require("./documents.service");
const document_record_schema_1 = require("./schemas/document-record.schema");
let DocumentsModule = class DocumentsModule {
};
exports.DocumentsModule = DocumentsModule;
exports.DocumentsModule = DocumentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: document_record_schema_1.DocumentRecord.name, schema: document_record_schema_1.DocumentRecordSchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
            memberships_module_1.MembershipsModule,
            branches_module_1.BranchesModule,
            classes_module_1.ClassesModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [documents_controller_1.DocumentsController],
        providers: [documents_service_1.DocumentsService],
        exports: [documents_service_1.DocumentsService],
    })
], DocumentsModule);
//# sourceMappingURL=documents.module.js.map