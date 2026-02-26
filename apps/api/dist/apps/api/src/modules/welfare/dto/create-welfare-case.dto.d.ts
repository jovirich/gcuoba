export declare class CreateWelfareCaseDto {
    title: string;
    description: string;
    categoryId: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string;
    targetAmount?: number;
    currency?: string;
    beneficiaryName?: string;
    beneficiaryUserId?: string;
}
