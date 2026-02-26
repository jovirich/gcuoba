export declare class CreateEventDto {
    title: string;
    description?: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string;
    location?: string;
    startAt: string;
    endAt?: string;
    status?: 'draft' | 'published' | 'cancelled';
}
