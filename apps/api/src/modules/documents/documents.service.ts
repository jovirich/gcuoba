import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { DocumentRecordDTO } from '@gcuoba/types';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Model } from 'mongoose';
import { BranchesService } from '../branches/branches.service';
import { ClassesService } from '../classes/classes.service';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentRecord } from './schemas/document-record.schema';

type ScopeType = 'private' | 'global' | 'branch' | 'class';
type UploadedDocumentFile = {
    originalname: string;
    mimetype?: string;
    size?: number;
    buffer: Buffer;
};

@Injectable()
export class DocumentsService {
    private readonly storageRoot = path.join(
        process.cwd(),
        'storage',
        'documents',
    );

    constructor(
        @InjectModel(DocumentRecord.name)
        private readonly documentModel: Model<DocumentRecord>,
        private readonly roleAssignmentsService: RoleAssignmentsService,
        private readonly membershipsService: MembershipsService,
        private readonly branchesService: BranchesService,
        private readonly classesService: ClassesService,
        private readonly auditLogsService: AuditLogsService,
    ) {}

    async upload(
        actorId: string,
        file: UploadedDocumentFile | undefined,
        dto: UploadDocumentDto,
    ): Promise<DocumentRecordDTO> {
        if (!file?.buffer || !file.originalname) {
            throw new BadRequestException('File is required');
        }

        const normalizedScope = await this.normalizeScope(
            actorId,
            dto.scopeType,
            dto.scopeId,
        );
        const visibility = this.resolveVisibility(
            dto.scopeType,
            dto.visibility,
        );

        const folder = this.scopeFolder(
            normalizedScope.scopeType,
            normalizedScope.scopeId,
            actorId,
        );
        const absoluteFolder = path.join(this.storageRoot, folder);
        await mkdir(absoluteFolder, { recursive: true });

        const extension = path.extname(file.originalname).slice(0, 12);
        const storedName = `${Date.now()}-${randomUUID()}${extension}`;
        const relativePath = path.join(folder, storedName);
        const absolutePath = path.join(this.storageRoot, relativePath);
        await writeFile(absolutePath, file.buffer);

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

    async listMine(actorId: string): Promise<DocumentRecordDTO[]> {
        const docs = await this.documentModel
            .find({ ownerUserId: actorId })
            .sort({ createdAt: -1 })
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }

    async listByScope(
        actorId: string,
        scopeType: 'global' | 'branch' | 'class',
        scopeId?: string,
    ): Promise<DocumentRecordDTO[]> {
        const normalizedScope = await this.normalizeScope(
            actorId,
            scopeType,
            scopeId,
        );

        const query: Record<string, unknown> = {
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

    async download(actorId: string, documentId: string) {
        const doc = await this.documentModel.findById(documentId).exec();
        if (!doc) {
            throw new NotFoundException('Document not found');
        }
        await this.ensureCanRead(actorId, doc);

        const absolutePath = path.join(this.storageRoot, doc.storagePath);
        const buffer = await readFile(absolutePath);
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

    async delete(
        actorId: string,
        documentId: string,
    ): Promise<{ deleted: boolean }> {
        const doc = await this.documentModel.findById(documentId).exec();
        if (!doc) {
            throw new NotFoundException('Document not found');
        }
        await this.ensureCanDelete(actorId, doc);

        await this.documentModel.deleteOne({ _id: documentId });
        const absolutePath = path.join(this.storageRoot, doc.storagePath);
        try {
            await unlink(absolutePath);
        } catch {
            // no-op if file has already been removed on disk
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

    private resolveVisibility(
        scopeType: ScopeType,
        visibility?: 'private' | 'scope' | 'public',
    ) {
        const resolved =
            visibility ?? (scopeType === 'private' ? 'private' : 'scope');
        if (scopeType === 'private' && resolved !== 'private') {
            throw new BadRequestException(
                'Private scope documents must have private visibility',
            );
        }
        return resolved;
    }

    private scopeFolder(
        scopeType: ScopeType,
        scopeId: string | null,
        actorId: string,
    ) {
        if (scopeType === 'private') {
            return path.join('private', actorId);
        }
        if (scopeType === 'global') {
            return 'global';
        }
        if (!scopeId) {
            throw new BadRequestException('scopeId is required');
        }
        return path.join(scopeType, scopeId);
    }

    private async normalizeScope(
        actorId: string,
        scopeType: ScopeType,
        scopeId?: string,
    ) {
        if (scopeType === 'private') {
            return { scopeType, scopeId: null };
        }

        if (scopeType === 'global') {
            const hasGlobal =
                await this.roleAssignmentsService.hasGlobalAccess(actorId);
            if (!hasGlobal) {
                throw new ForbiddenException('Not authorized for global scope');
            }
            return { scopeType, scopeId: null };
        }

        if (!scopeId) {
            throw new BadRequestException(
                `scopeId is required for ${scopeType} scope`,
            );
        }

        await this.ensureScopeExists(scopeType, scopeId);
        const hasAccess = await this.hasScopeAccess(
            actorId,
            scopeType,
            scopeId,
        );
        if (!hasAccess) {
            throw new ForbiddenException('Not authorized for this scope');
        }
        return { scopeType, scopeId };
    }

    private async ensureScopeExists(
        scopeType: 'branch' | 'class',
        scopeId: string,
    ) {
        if (scopeType === 'branch') {
            const exists = await this.branchesService.exists(scopeId);
            if (!exists) {
                throw new BadRequestException('Branch scope not found');
            }
            return;
        }

        const exists = await this.classesService.exists(scopeId);
        if (!exists) {
            throw new BadRequestException('Class scope not found');
        }
    }

    private async hasScopeAccess(
        actorId: string,
        scopeType: 'branch' | 'class',
        scopeId: string,
    ): Promise<boolean> {
        const hasGlobal =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);
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

            return memberships.some(
                (membership) =>
                    membership.status === 'approved' &&
                    membership.branchId === scopeId,
            );
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

    private async ensureCanRead(actorId: string, doc: DocumentRecord) {
        if (doc.ownerUserId === actorId) {
            return;
        }
        if (doc.visibility === 'public') {
            return;
        }
        if (doc.visibility === 'private' || doc.scopeType === 'private') {
            throw new ForbiddenException(
                'Not authorized to view this document',
            );
        }

        if (doc.scopeType === 'global') {
            const hasGlobal =
                await this.roleAssignmentsService.hasGlobalAccess(actorId);
            if (!hasGlobal) {
                throw new ForbiddenException(
                    'Not authorized for this global document',
                );
            }
            return;
        }

        const scopeId = doc.scopeId ?? '';
        const hasAccess = await this.hasScopeAccess(
            actorId,
            doc.scopeType,
            scopeId,
        );
        if (!hasAccess) {
            throw new ForbiddenException(
                'Not authorized to view this document',
            );
        }
    }

    private async ensureCanDelete(actorId: string, doc: DocumentRecord) {
        if (doc.ownerUserId === actorId) {
            return;
        }

        const hasGlobal =
            await this.roleAssignmentsService.hasGlobalAccess(actorId);
        if (hasGlobal) {
            return;
        }

        if (doc.scopeType === 'branch' || doc.scopeType === 'class') {
            const scopeId = doc.scopeId ?? '';
            if (!scopeId) {
                throw new ForbiddenException(
                    'Not authorized to delete document',
                );
            }
            const hasScopeAccess = await this.hasScopeAccess(
                actorId,
                doc.scopeType,
                scopeId,
            );
            if (hasScopeAccess) {
                return;
            }
        }

        throw new ForbiddenException('Not authorized to delete document');
    }

    private toDto(doc: DocumentRecord): DocumentRecordDTO {
        const createdAt = (
            doc as DocumentRecord & { createdAt?: Date }
        ).createdAt?.toISOString();

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
}
