import {
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateClassDto {
    @IsString()
    @IsNotEmpty()
    label!: string;

    @IsNumber()
    @Min(1900)
    @Max(2100)
    entryYear!: number;

    @IsString()
    @IsIn(['active', 'inactive'])
    status!: 'active' | 'inactive';
}

export class UpdateClassDto {
    @IsOptional()
    @IsString()
    label?: string;

    @IsOptional()
    @IsNumber()
    @Min(1900)
    @Max(2100)
    entryYear?: number;

    @IsOptional()
    @IsString()
    @IsIn(['active', 'inactive'])
    status?: 'active' | 'inactive';
}
