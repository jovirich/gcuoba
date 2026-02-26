import type { ProfileDTO } from '@gcuoba/types';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    findOne(userId: string, user: AuthenticatedUser): Promise<ProfileDTO | null>;
    upsert(userId: string, payload: UpsertProfileDto, user: AuthenticatedUser): Promise<ProfileDTO>;
    private ensureSelf;
}
