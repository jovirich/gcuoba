import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(190)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(190)
    country?: string;
}

export class UpdateBranchDto {
    @IsOptional()
    @IsString()
    @MaxLength(190)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(190)
    country?: string;
}
