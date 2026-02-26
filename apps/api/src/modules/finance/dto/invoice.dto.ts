import { IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
    @IsMongoId()
    schemeId!: string;

    @IsString()
    userId!: string;

    @IsNumber()
    amount!: number;

    @IsOptional()
    @IsString()
    currency?: string;
}
