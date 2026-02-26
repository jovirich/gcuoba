export declare class CreateClassDto {
    label: string;
    entryYear: number;
    status: 'active' | 'inactive';
}
export declare class UpdateClassDto {
    label?: string;
    entryYear?: number;
    status?: 'active' | 'inactive';
}
