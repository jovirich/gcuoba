export declare class UpdateEventDto {
    title?: string;
    description?: string;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string;
    location?: string;
    startAt?: string;
    endAt?: string;
    status?: 'draft' | 'published' | 'cancelled';
}
