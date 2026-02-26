declare class InvoiceApplicationDto {
    invoiceId: string;
    amount: number;
}
export declare class RecordPaymentDto {
    payerUserId: string;
    amount: number;
    channel: string;
    reference?: string;
    currency?: string;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    notes?: string;
    invoiceApplications: InvoiceApplicationDto[];
}
export {};
