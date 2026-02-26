import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateWelfareCaseDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsString()
    @IsNotEmpty()
    categoryId!: string;

    @IsEnum(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    targetAmount?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    beneficiaryName?: string;

    @IsOptional()
    @IsString()
    beneficiaryUserId?: string;
}
