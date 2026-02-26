"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleAssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const role_assignment_schema_1 = require("./schemas/role-assignment.schema");
const role_schema_1 = require("../roles/schemas/role.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const FORCED_GLOBAL_ADMIN_EMAILS = new Set(['ejovi.ekakitie@hotmail.com']);
let RoleAssignmentsService = class RoleAssignmentsService {
    assignmentModel;
    roleModel;
    userModel;
    constructor(assignmentModel, roleModel, userModel) {
        this.assignmentModel = assignmentModel;
        this.roleModel = roleModel;
        this.userModel = userModel;
    }
    async ensureGlobalAdminForUser(userId) {
        const roleCode = 'super_admin';
        let role = await this.roleModel
            .findOne({ code: roleCode, scope: 'global' })
            .exec();
        if (!role) {
            role = await this.roleModel.create({
                code: roleCode,
                name: 'Super Admin',
                scope: 'global',
            });
        }
        const existing = await this.assignmentModel
            .findOne({
            userId,
            scopeType: 'global',
            roleCode: roleCode,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .select('_id')
            .lean()
            .exec();
        if (existing) {
            return;
        }
        await this.assignmentModel.create({
            userId,
            roleId: role._id,
            roleCode: roleCode,
            scopeType: 'global',
            scopeId: null,
            startDate: new Date(),
            endDate: null,
        });
    }
    async activeAssignmentsForUser(userId) {
        const docs = await this.assignmentModel
            .find({
            userId,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .lean()
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async managedBranchIds(userId) {
        const docs = await this.assignmentModel
            .find({
            userId,
            scopeType: 'branch',
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .lean()
            .exec();
        return docs
            .map((doc) => doc.scopeId)
            .filter((id) => Boolean(id));
    }
    async managedClassIds(userId) {
        const docs = await this.assignmentModel
            .find({
            userId,
            scopeType: 'class',
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .lean()
            .exec();
        return docs
            .map((doc) => doc.scopeId)
            .filter((id) => Boolean(id));
    }
    async hasGlobalAccess(userId) {
        const count = await this.assignmentModel
            .countDocuments({
            userId,
            scopeType: 'global',
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .exec();
        if (count > 0) {
            return true;
        }
        const user = await this.userModel
            .findById(userId)
            .select('email')
            .lean()
            .exec();
        const normalizedEmail = user?.email?.trim().toLowerCase();
        if (!normalizedEmail ||
            !FORCED_GLOBAL_ADMIN_EMAILS.has(normalizedEmail)) {
            return false;
        }
        await this.ensureGlobalAdminForUser(userId);
        return true;
    }
    async hasAnyActiveAssignment(userId) {
        const count = await this.assignmentModel
            .countDocuments({
            userId,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .exec();
        if (count > 0) {
            return true;
        }
        return this.hasGlobalAccess(userId);
    }
    async listGlobalUserIds() {
        const docs = await this.assignmentModel
            .find({
            scopeType: 'global',
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .select('userId')
            .lean()
            .exec();
        return Array.from(new Set(docs.map((doc) => doc.userId).filter(Boolean)));
    }
    async listBranchExecutiveUserIds(branchId) {
        const docs = await this.assignmentModel
            .find({
            scopeType: 'branch',
            scopeId: branchId,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .select('userId')
            .lean()
            .exec();
        return Array.from(new Set(docs.map((doc) => doc.userId).filter(Boolean)));
    }
    async listClassExecutiveUserIds(classId) {
        const docs = await this.assignmentModel
            .find({
            scopeType: 'class',
            scopeId: classId,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .select('userId')
            .lean()
            .exec();
        return Array.from(new Set(docs.map((doc) => doc.userId).filter(Boolean)));
    }
    async listActiveAssignments() {
        const docs = await this.assignmentModel
            .find({
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .lean()
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async createRoleAssignment(dto) {
        const role = await this.roleModel
            .findOne({ code: dto.roleCode, scope: dto.scopeType })
            .exec();
        if (!role) {
            throw new common_1.NotFoundException('Role not found for the requested scope');
        }
        const scopeId = dto.scopeType === 'global'
            ? null
            : dto.scopeId
                ? dto.scopeId
                : null;
        if (dto.scopeType !== 'global' && !scopeId) {
            throw new common_1.BadRequestException('scopeId is required for branch/class assignments');
        }
        const existing = await this.assignmentModel
            .findOne({
            userId: dto.userId,
            roleCode: role.code,
            scopeType: dto.scopeType,
            scopeId: scopeId,
            $or: [{ endDate: null }, { endDate: { $exists: false } }],
        })
            .lean()
            .exec();
        if (existing) {
            throw new common_1.BadRequestException('This assignment already exists');
        }
        const created = await this.assignmentModel.create({
            userId: dto.userId,
            roleId: role._id,
            roleCode: role.code,
            scopeType: dto.scopeType,
            scopeId: scopeId,
            startDate: new Date(),
            endDate: null,
        });
        return this.toDto(created);
    }
    toDto(doc) {
        return {
            id: doc._id.toString(),
            userId: doc.userId,
            roleId: doc.roleId?.toString(),
            roleCode: doc.roleCode,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            startDate: doc.startDate?.toISOString(),
            endDate: doc.endDate?.toISOString() ?? null,
        };
    }
};
exports.RoleAssignmentsService = RoleAssignmentsService;
exports.RoleAssignmentsService = RoleAssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(role_assignment_schema_1.RoleAssignment.name)),
    __param(1, (0, mongoose_1.InjectModel)(role_schema_1.Role.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], RoleAssignmentsService);
//# sourceMappingURL=role-assignments.service.js.map