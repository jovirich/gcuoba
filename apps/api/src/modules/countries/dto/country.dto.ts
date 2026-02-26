import {
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
    MaxLength,
} from 'class-validator';

export class CreateCountryDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name!: string;

    @IsOptional()
    @IsString()
    @Length(2, 3)
    isoCode?: string;
}

export class UpdateCountryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsString()
    @Length(2, 3)
    isoCode?: string | null;
}
