import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
    @IsEnum(['private', 'global', 'branch', 'class'])
    scopeType!: 'private' | 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string;

    @IsOptional()
    @IsEnum(['private', 'scope', 'public'])
    visibility?: 'private' | 'scope' | 'public';
}
