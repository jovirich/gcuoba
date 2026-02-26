import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateDuesSchemeDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsNumber()
    @Min(0)
    amount!: number;

    @IsString()
    currency!: string;

    @IsIn(['monthly', 'quarterly', 'annual', 'one_off'])
    frequency!: 'monthly' | 'quarterly' | 'annual' | 'one_off';

    @IsIn(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    scopeId?: string;

    @IsOptional()
    @IsIn(['active', 'inactive'])
    status?: 'active' | 'inactive';
}

export class UpdateDuesSchemeDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsIn(['monthly', 'quarterly', 'annual', 'one_off'])
    frequency?: 'monthly' | 'quarterly' | 'annual' | 'one_off';

    @IsOptional()
    @IsIn(['global', 'branch', 'class'])
    scopeType?: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    scopeId?: string | null;

    @IsOptional()
    @IsIn(['active', 'inactive'])
    status?: 'active' | 'inactive';
}

export class GenerateSchemeInvoicesDto {
    @IsNumber()
    @Min(2000)
    @Max(2100)
    year!: number;
}
