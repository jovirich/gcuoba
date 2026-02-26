import type { DocumentRecordDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { BranchesService } from '../branches/branches.service';
import { ClassesService } from '../classes/classes.service';
import { MembershipsService } from '../memberships/memberships.service';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentRecord } from './schemas/document-record.schema';
type UploadedDocumentFile = {
    originalname: string;
    mimetype?: string;
    size?: number;
    buffer: Buffer;
};
export declare class DocumentsService {
    private readonly documentModel;
    private readonly roleAssignmentsService;
    private readonly membershipsService;
    private readonly branchesService;
    private readonly classesService;
    private readonly auditLogsService;
    private readonly storageRoot;
    constructor(documentModel: Model<DocumentRecord>, roleAssignmentsService: RoleAssignmentsService, membershipsService: MembershipsService, branchesService: BranchesService, classesService: ClassesService, auditLogsService: AuditLogsService);
    upload(actorId: string, file: UploadedDocumentFile | undefined, dto: UploadDocumentDto): Promise<DocumentRecordDTO>;
    listMine(actorId: string): Promise<DocumentRecordDTO[]>;
    listByScope(actorId: string, scopeType: 'global' | 'branch' | 'class', scopeId?: string): Promise<DocumentRecordDTO[]>;
    download(actorId: string, documentId: string): Promise<{
        filename: string;
        mimeType: string;
        content: NonSharedBuffer;
    }>;
    delete(actorId: string, documentId: string): Promise<{
        deleted: boolean;
    }>;
    private resolveVisibility;
    private scopeFolder;
    private normalizeScope;
    private ensureScopeExists;
    private hasScopeAccess;
    private ensureCanRead;
    private ensureCanDelete;
    private toDto;
}
export {};
