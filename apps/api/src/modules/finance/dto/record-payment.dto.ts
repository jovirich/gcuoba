import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

class InvoiceApplicationDto {
    @IsString()
    @IsNotEmpty()
    invoiceId!: string;

    @IsNumber()
    @Min(0.01)
    amount!: number;
}

export class RecordPaymentDto {
    @IsString()
    @IsNotEmpty()
    payerUserId!: string;

    @IsNumber()
    @Min(0.01)
    amount!: number;

    @IsString()
    channel!: string;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsEnum(['global', 'branch', 'class'])
    scopeType?: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string | null;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsArray()
    invoiceApplications!: InvoiceApplicationDto[];
}
