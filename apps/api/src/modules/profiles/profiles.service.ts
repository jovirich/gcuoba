import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ProfileDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { Profile } from './schemas/profile.schema';

@Injectable()
export class ProfilesService {
    constructor(
        @InjectModel(Profile.name)
        private readonly profileModel: Model<Profile>,
    ) {}

    async findByUserId(userId: string): Promise<ProfileDTO | null> {
        const doc = await this.profileModel
            .findOne({ userId })
            .lean<Profile>()
            .exec();
        if (!doc) {
            return null;
        }

        return this.toDto(doc);
    }

    async upsert(
        userId: string,
        payload: UpsertProfileDto,
    ): Promise<ProfileDTO> {
        const doc = await this.profileModel
            .findOneAndUpdate(
                { userId },
                { userId, ...payload },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            )
            .lean<Profile>()
            .exec();

        if (!doc) {
            throw new Error('Unable to persist profile');
        }

        return this.toDto(doc);
    }

    private toDto(doc: Profile): ProfileDTO {
        return {
            id: doc._id?.toString?.() ?? doc.userId,
            userId: doc.userId,
            title: doc.title,
            firstName: doc.firstName,
            middleName: doc.middleName ?? null,
            lastName: doc.lastName,
            dobDay: doc.dobDay ?? null,
            dobMonth: doc.dobMonth ?? null,
            dobYear: doc.dobYear ?? null,
            sex: doc.sex ?? null,
            stateOfOrigin: doc.stateOfOrigin ?? null,
            lgaOfOrigin: doc.lgaOfOrigin ?? null,
            residence: {
                houseNo: doc.resHouseNo ?? null,
                street: doc.resStreet ?? null,
                area: doc.resArea ?? null,
                city: doc.resCity ?? null,
                country: doc.resCountry ?? null,
            },
            occupation: doc.occupation ?? null,
            photoUrl: doc.photoUrl ?? null,
            houseId: doc.houseId ?? null,
            privacyLevel: doc.privacyLevel ?? 'public_to_members',
        };
    }
}
