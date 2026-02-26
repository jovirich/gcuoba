import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHouseDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(190)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    motto?: string;
}

export class UpdateHouseDto {
    @IsOptional()
    @IsString()
    @MaxLength(190)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    motto?: string;
}
