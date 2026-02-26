export declare class CreateDuesSchemeDto {
    title: string;
    amount: number;
    currency: string;
    frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string;
    status?: 'active' | 'inactive';
}
export declare class UpdateDuesSchemeDto {
    title?: string;
    amount?: number;
    currency?: string;
    frequency?: 'monthly' | 'quarterly' | 'annual' | 'one_off';
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    status?: 'active' | 'inactive';
}
export declare class GenerateSchemeInvoicesDto {
    year: number;
}
