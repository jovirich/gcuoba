import {
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
} from 'class-validator';

const TITLES = ['mr', 'mrs', 'ms', 'chief', 'dr', 'prof'] as const;

export class RegisterMemberDto {
    @IsIn(TITLES)
    title!: (typeof TITLES)[number];

    @IsString()
    @MaxLength(80)
    firstName!: string;

    @IsOptional()
    @IsString()
    @MaxLength(80)
    middleName?: string;

    @IsString()
    @MaxLength(80)
    lastName!: string;

    @IsString()
    @MaxLength(32)
    phone!: string;

    @IsEmail()
    email!: string;

    @MinLength(6)
    password!: string;

    @IsString()
    classId!: string;

    @IsString()
    branchId!: string;

    @IsString()
    houseId!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    note?: string;

    @IsOptional()
    @IsUrl({ require_protocol: false })
    photoUrl?: string;
}
