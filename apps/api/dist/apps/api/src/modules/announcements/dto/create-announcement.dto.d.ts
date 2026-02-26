export declare class CreateAnnouncementDto {
    title: string;
    body: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string;
    status?: 'draft' | 'published';
    publishedAt?: string;
}
