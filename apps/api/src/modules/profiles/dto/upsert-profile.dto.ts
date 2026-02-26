import {
    IsEnum,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class UpsertProfileDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsString()
    @MaxLength(100)
    firstName!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    middleName?: string;

    @IsString()
    @MaxLength(100)
    lastName!: string;

    @IsOptional()
    @Min(1)
    @Max(31)
    dobDay?: number;

    @IsOptional()
    @Min(1)
    @Max(12)
    dobMonth?: number;

    @IsOptional()
    @Min(1900)
    @Max(2100)
    dobYear?: number;

    @IsOptional()
    @IsString()
    sex?: string;

    @IsOptional()
    @IsString()
    stateOfOrigin?: string;

    @IsOptional()
    @IsString()
    lgaOfOrigin?: string;

    @IsOptional()
    @IsString()
    resHouseNo?: string;

    @IsOptional()
    @IsString()
    resStreet?: string;

    @IsOptional()
    @IsString()
    resArea?: string;

    @IsOptional()
    @IsString()
    resCity?: string;

    @IsOptional()
    @IsString()
    resCountry?: string;

    @IsOptional()
    @IsString()
    occupation?: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

    @IsOptional()
    @IsString()
    houseId?: string;

    @IsOptional()
    @IsEnum(['public', 'public_to_members', 'private'])
    privacyLevel?: 'public' | 'public_to_members' | 'private';
}
