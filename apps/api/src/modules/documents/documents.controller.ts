import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import type { DocumentRecordDTO } from '@gcuoba/types';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentsService } from './documents.service';

type UploadedDocumentFile = {
    originalname: string;
    mimetype?: string;
    size?: number;
    buffer: Buffer;
};

@Controller('documents')
@RequireActive()
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Get('mine')
    listMine(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<DocumentRecordDTO[]> {
        return this.documentsService.listMine(user.id);
    }

    @Get('scope')
    listScope(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: string,
        @Query('scopeId') scopeId?: string,
    ): Promise<DocumentRecordDTO[]> {
        const parsedScopeType = this.parseScopeType(scopeType);
        return this.documentsService.listByScope(
            user.id,
            parsedScopeType,
            scopeId,
        );
    }

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
        }),
    )
    upload(
        @CurrentUser() user: AuthenticatedUser,
        @UploadedFile() file: UploadedDocumentFile | undefined,
        @Query() dto: UploadDocumentDto,
    ): Promise<DocumentRecordDTO> {
        return this.documentsService.upload(user.id, file, dto);
    }

    @Get(':documentId/download')
    async download(
        @CurrentUser() user: AuthenticatedUser,
        @Param('documentId') documentId: string,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const file = await this.documentsService.download(user.id, documentId);
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="${file.filename}"`,
        );
        response.setHeader(
            'Content-Type',
            file.mimeType || 'application/octet-stream',
        );
        return new StreamableFile(file.content);
    }

    @Delete(':documentId')
    remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('documentId') documentId: string,
    ) {
        return this.documentsService.delete(user.id, documentId);
    }

    private parseScopeType(scopeType?: string): 'global' | 'branch' | 'class' {
        if (!scopeType) {
            throw new BadRequestException('scopeType is required');
        }
        if (
            scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class'
        ) {
            return scopeType;
        }
        throw new BadRequestException('Invalid scopeType');
    }
}
