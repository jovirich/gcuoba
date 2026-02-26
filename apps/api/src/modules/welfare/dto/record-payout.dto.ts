import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class RecordPayoutDto {
    @IsNumber()
    @Min(0.01)
    amount!: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsString()
    @IsNotEmpty()
    channel!: string;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
