export declare class UploadDocumentDto {
    scopeType: 'private' | 'global' | 'branch' | 'class';
    scopeId?: string;
    visibility?: 'private' | 'scope' | 'public';
}
