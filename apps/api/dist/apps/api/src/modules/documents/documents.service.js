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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const mongoose_2 = require("mongoose");
const branches_service_1 = require("../branches/branches.service");
const classes_service_1 = require("../classes/classes.service");
const memberships_service_1 = require("../memberships/memberships.service");
const role_assignments_service_1 = require("../role-assignments/role-assignments.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const document_record_schema_1 = require("./schemas/document-record.schema");
let DocumentsService = class DocumentsService {
    documentModel;
    roleAssignmentsService;
    membershipsService;
    branchesService;
    classesService;
    auditLogsService;
    storageRoot = node_path_1.default.join(process.cwd(), 'storage', 'documents');
    constructor(documentModel, roleAssignmentsService, membershipsService, branchesService, classesService, auditLogsService) {
        this.documentModel = documentModel;
        this.roleAssignmentsService = roleAssignmentsService;
        this.membershipsService = membershipsService;
        this.branchesService = branchesService;
        this.classesService = classesService;
        this.auditLogsService = auditLogsService;
    }
    async upload(actorId, file, dto) {
        if (!file?.buffer || !file.originalname) {
            throw new common_1.BadRequestException('File is required');
        }
        const normalizedScope = await this.normalizeScope(actorId, dto.scopeType, dto.scopeId);
        const visibility = this.resolveVisibility(dto.scopeType, dto.visibility);
        const folder = this.scopeFolder(normalizedScope.scopeType, normalizedScope.scopeId, actorId);
        const absoluteFolder = node_path_1.default.join(this.storageRoot, folder);
        await (0, promises_1.mkdir)(absoluteFolder, { recursive: true });
        const extension = node_path_1.default.extname(file.originalname).slice(0, 12);
        const storedName = `${Date.now()}-${(0, node_crypto_1.randomUUID)()}${extension}`;
        const relativePath = node_path_1.default.join(folder, storedName);
        const absolutePath = node_path_1.default.join(this.storageRoot, relativePath);
        await (0, promises_1.writeFile)(absolutePath, file.buffer);
        const doc = await this.documentModel.create({
            ownerUserId: actorId,
            scopeType: normalizedScope.scopeType,
            scopeId: normalizedScope.scopeId,
            originalName: file.originalname,
            storedName,
            storagePath: relativePath,
            mimeType: file.mimetype || 'application/octet-stream',
            sizeBytes: file.size ?? file.buffer.length,
            visibility,
        });
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'document.uploaded',
            resourceType: 'document',
            resourceId: doc._id.toString(),
            scopeType: normalizedScope.scopeType,
            scopeId: normalizedScope.scopeId,
            metadata: {
                originalName: doc.originalName,
                mimeType: doc.mimeType,
                sizeBytes: doc.sizeBytes,
                visibility: doc.visibility,
            },
        });
        return this.toDto(doc);
    }
    async listMine(actorId) {
        const docs = await this.documentModel
            .find({ ownerUserId: actorId })
            .sort({ createdAt: -1 })
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async listByScope(actorId, scopeType, scopeId) {
        const normalizedScope = await this.normalizeScope(actorId, scopeType, scopeId);
        const query = {
            scopeType: normalizedScope.scopeType,
            scopeId: normalizedScope.scopeId,
            $or: [
                { visibility: { $in: ['scope', 'public'] } },
                { ownerUserId: actorId },
            ],
        };
        const docs = await this.documentModel
            .find(query)
            .sort({ createdAt: -1 })
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async download(actorId, documentId) {
        const doc = await this.documentModel.findById(documentId).exec();
        if (!doc) {
            throw new common_1.NotFoundException('Document not found');
        }
        await this.ensureCanRead(actorId, doc);
        const absolutePath = node_path_1.default.join(this.storageRoot, doc.storagePath);
        const buffer = await (0, promises_1.readFile)(absolutePath);
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'document.downloaded',
            resourceType: 'document',
            resourceId: doc._id.toString(),
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            metadata: {
                ownerUserId: doc.ownerUserId,
            },
        });
        return {
            filename: doc.originalName,
            mimeType: doc.mimeType,
            content: buffer,
        };
    }
    async delete(actorId, documentId) {
        const doc = await this.documentModel.findById(documentId).exec();
        if (!doc) {
            throw new common_1.NotFoundException('Document not found');
        }
        await this.ensureCanDelete(actorId, doc);
        await this.documentModel.deleteOne({ _id: documentId });
        const absolutePath = node_path_1.default.join(this.storageRoot, doc.storagePath);
        try {
            await (0, promises_1.unlink)(absolutePath);
        }
        catch {
        }
        await this.auditLogsService.record({
            actorUserId: actorId,
            action: 'document.deleted',
            resourceType: 'document',
            resourceId: doc._id.toString(),
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            metadata: {
                originalName: doc.originalName,
                ownerUserId: doc.ownerUserId,
            },
        });
        return { deleted: true };
    }
    resolveVisibility(scopeType, visibility) {
        const resolved = visibility ?? (scopeType === 'private' ? 'private' : 'scope');
        if (scopeType === 'private' && resolved !== 'private') {
            throw new common_1.BadRequestException('Private scope documents must have private visibility');
        }
        return resolved;
    }
    scopeFolder(scopeType, scopeId, actorId) {
        if (scopeType === 'private') {
            return node_path_1.default.join('private', actorId);
        }
        if (scopeType === 'global') {
            return 'global';
        }
        if (!scopeId) {
            throw new common_1.BadRequestException('scopeId is required');
        }
        return node_path_1.default.join(scopeType, scopeId);
    }
    async normalizeScope(actorId, scopeType, scopeId) {
        if (scopeType === 'private') {
            return { scopeType, scopeId: null };
        }
        if (scopeType === 'global') {
            const hasGlobal = await this.roleAssignmentsService.hasGlobalAccess(actorId);
            if (!hasGlobal) {
                throw new common_1.ForbiddenException('Not authorized for global scope');
            }
            return { scopeType, scopeId: null };
        }
        if (!scopeId) {
            throw new common_1.BadRequestException(`scopeId is required for ${scopeType} scope`);
        }
        await this.ensureScopeExists(scopeType, scopeId);
        const hasAccess = await this.hasScopeAccess(actorId, scopeType, scopeId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Not authorized for this scope');
        }
        return { scopeType, scopeId };
    }
    async ensureScopeExists(scopeType, scopeId) {
        if (scopeType === 'branch') {
            const exists = await this.branchesService.exists(scopeId);
            if (!exists) {
                throw new common_1.BadRequestException('Branch scope not found');
            }
            return;
        }
        const exists = await this.classesService.exists(scopeId);
        if (!exists) {
            throw new common_1.BadRequestException('Class scope not found');
        }
    }
    async hasScopeAccess(actorId, scopeType, scopeId) {
        const hasGlobal = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobal) {
            return true;
        }
        if (scopeType === 'branch') {
            const [managedBranches, memberships] = await Promise.all([
                this.roleAssignmentsService.managedBranchIds(actorId),
                this.membershipsService.listBranchMemberships(actorId),
            ]);
            if (managedBranches.includes(scopeId)) {
                return true;
            }
            return memberships.some((membership) => membership.status === 'approved' &&
                membership.branchId === scopeId);
        }
        const [managedClasses, classMembership] = await Promise.all([
            this.roleAssignmentsService.managedClassIds(actorId),
            this.membershipsService.getClassMembership(actorId),
        ]);
        if (managedClasses.includes(scopeId)) {
            return true;
        }
        return classMembership?.classId === scopeId;
    }
    async ensureCanRead(actorId, doc) {
        if (doc.ownerUserId === actorId) {
            return;
        }
        if (doc.visibility === 'public') {
            return;
        }
        if (doc.visibility === 'private' || doc.scopeType === 'private') {
            throw new common_1.ForbiddenException('Not authorized to view this document');
        }
        if (doc.scopeType === 'global') {
            const hasGlobal = await this.roleAssignmentsService.hasGlobalAccess(actorId);
            if (!hasGlobal) {
                throw new common_1.ForbiddenException('Not authorized for this global document');
            }
            return;
        }
        const scopeId = doc.scopeId ?? '';
        const hasAccess = await this.hasScopeAccess(actorId, doc.scopeType, scopeId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Not authorized to view this document');
        }
    }
    async ensureCanDelete(actorId, doc) {
        if (doc.ownerUserId === actorId) {
            return;
        }
        const hasGlobal = await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobal) {
            return;
        }
        if (doc.scopeType === 'branch' || doc.scopeType === 'class') {
            const scopeId = doc.scopeId ?? '';
            if (!scopeId) {
                throw new common_1.ForbiddenException('Not authorized to delete document');
            }
            const hasScopeAccess = await this.hasScopeAccess(actorId, doc.scopeType, scopeId);
            if (hasScopeAccess) {
                return;
            }
        }
        throw new common_1.ForbiddenException('Not authorized to delete document');
    }
    toDto(doc) {
        const createdAt = doc.createdAt?.toISOString();
        return {
            id: doc._id.toString(),
            ownerUserId: doc.ownerUserId,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            originalName: doc.originalName,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            visibility: doc.visibility,
            uploadedAt: createdAt ?? new Date().toISOString(),
        };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(document_record_schema_1.DocumentRecord.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        role_assignments_service_1.RoleAssignmentsService,
        memberships_service_1.MembershipsService,
        branches_service_1.BranchesService,
        classes_service_1.ClassesService,
        audit_logs_service_1.AuditLogsService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map