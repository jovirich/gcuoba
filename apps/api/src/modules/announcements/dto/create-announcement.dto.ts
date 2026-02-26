import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateAnnouncementDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    body!: string;

    @IsEnum(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string;

    @IsEnum(['draft', 'published'])
    @IsOptional()
    status?: 'draft' | 'published';

    @IsOptional()
    @IsDateString()
    publishedAt?: string;
}
