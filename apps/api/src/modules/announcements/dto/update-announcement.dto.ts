import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAnnouncementDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    body?: string;

    @IsOptional()
    @IsEnum(['global', 'branch', 'class'])
    scopeType?: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string;

    @IsOptional()
    @IsEnum(['draft', 'published'])
    status?: 'draft' | 'published';

    @IsOptional()
    @IsDateString()
    publishedAt?: string;
}
