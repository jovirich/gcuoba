export declare class UpdateAnnouncementDto {
    title?: string;
    body?: string;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string;
    status?: 'draft' | 'published';
    publishedAt?: string;
}
