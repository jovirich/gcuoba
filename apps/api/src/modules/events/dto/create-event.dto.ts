import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsDateString()
    startAt!: string;

    @IsOptional()
    @IsDateString()
    endAt?: string;

    @IsEnum(['draft', 'published', 'cancelled'])
    @IsOptional()
    status?: 'draft' | 'published' | 'cancelled';
}
