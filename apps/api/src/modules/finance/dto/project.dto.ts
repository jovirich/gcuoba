import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsIn(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    scopeId?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    budget?: number;

    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;

    @IsOptional()
    @IsIn(['planning', 'active', 'completed'])
    status?: 'planning' | 'active' | 'completed';

    @IsOptional()
    @IsString()
    ownerId?: string | null;
}

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsIn(['global', 'branch', 'class'])
    scopeType?: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    scopeId?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    budget?: number;

    @IsOptional()
    @IsString()
    startDate?: string | null;

    @IsOptional()
    @IsString()
    endDate?: string | null;

    @IsOptional()
    @IsIn(['planning', 'active', 'completed'])
    status?: 'planning' | 'active' | 'completed';

    @IsOptional()
    @IsString()
    ownerId?: string | null;
}
