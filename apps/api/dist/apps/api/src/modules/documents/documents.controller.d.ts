import { StreamableFile } from '@nestjs/common';
import type { DocumentRecordDTO } from '@gcuoba/types';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentsService } from './documents.service';
type UploadedDocumentFile = {
    originalname: string;
    mimetype?: string;
    size?: number;
    buffer: Buffer;
};
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    listMine(user: AuthenticatedUser): Promise<DocumentRecordDTO[]>;
    listScope(user: AuthenticatedUser, scopeType?: string, scopeId?: string): Promise<DocumentRecordDTO[]>;
    upload(user: AuthenticatedUser, file: UploadedDocumentFile | undefined, dto: UploadDocumentDto): Promise<DocumentRecordDTO>;
    download(user: AuthenticatedUser, documentId: string, response: Response): Promise<StreamableFile>;
    remove(user: AuthenticatedUser, documentId: string): Promise<{
        deleted: boolean;
    }>;
    private parseScopeType;
}
export {};
