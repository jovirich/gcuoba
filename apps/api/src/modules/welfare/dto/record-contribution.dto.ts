import {
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class RecordContributionDto {
    @IsString()
    @IsNotEmpty()
    contributorName!: string;

    @IsOptional()
    @IsEmail()
    contributorEmail?: string;

    @IsOptional()
    @IsString()
    contributorUserId?: string;

    @IsNumber()
    @Min(0.01)
    amount!: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
