export declare class CreateProjectDto {
    name: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    budget?: number;
    startDate?: string;
    endDate?: string;
    status?: 'planning' | 'active' | 'completed';
    ownerId?: string | null;
}
export declare class UpdateProjectDto {
    name?: string;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    budget?: number;
    startDate?: string | null;
    endDate?: string | null;
    status?: 'planning' | 'active' | 'completed';
    ownerId?: string | null;
}
