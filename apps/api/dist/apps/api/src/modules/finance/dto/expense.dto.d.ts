export declare class CreateExpenseDto {
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    projectId?: string | null;
    title: string;
    description?: string;
    notes?: string;
    amount: number;
    currency?: string;
}
export declare class UpdateExpenseDto {
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    projectId?: string | null;
    title?: string;
    description?: string | null;
    notes?: string | null;
    amount?: number;
    currency?: string;
}
