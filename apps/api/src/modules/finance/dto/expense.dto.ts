import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateExpenseDto {
    @IsIn(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    scopeId?: string | null;

    @IsOptional()
    @IsString()
    projectId?: string | null;

    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsNumber()
    @Min(0.01)
    amount!: number;

    @IsOptional()
    @IsString()
    currency?: string;
}

export class UpdateExpenseDto {
    @IsOptional()
    @IsIn(['global', 'branch', 'class'])
    scopeType?: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    scopeId?: string | null;

    @IsOptional()
    @IsString()
    projectId?: string | null;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsString()
    notes?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;
}
