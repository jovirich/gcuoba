export declare class UpsertProfileDto {
    title?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dobDay?: number;
    dobMonth?: number;
    dobYear?: number;
    sex?: string;
    stateOfOrigin?: string;
    lgaOfOrigin?: string;
    resHouseNo?: string;
    resStreet?: string;
    resArea?: string;
    resCity?: string;
    resCountry?: string;
    occupation?: string;
    photoUrl?: string;
    houseId?: string;
    privacyLevel?: 'public' | 'public_to_members' | 'private';
}
