import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(['global', 'branch', 'class'])
    scopeType?: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsDateString()
    startAt?: string;

    @IsOptional()
    @IsDateString()
    endAt?: string;

    @IsOptional()
    @IsEnum(['draft', 'published', 'cancelled'])
    status?: 'draft' | 'published' | 'cancelled';
}
