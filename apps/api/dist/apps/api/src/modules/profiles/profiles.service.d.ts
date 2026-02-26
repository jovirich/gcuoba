import type { ProfileDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { Profile } from './schemas/profile.schema';
export declare class ProfilesService {
    private readonly profileModel;
    constructor(profileModel: Model<Profile>);
    findByUserId(userId: string): Promise<ProfileDTO | null>;
    upsert(userId: string, payload: UpsertProfileDto): Promise<ProfileDTO>;
    private toDto;
}
