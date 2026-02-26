import { Document } from 'mongoose';
export declare class Profile extends Document {
    userId: string;
    title?: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    dobDay?: number | null;
    dobMonth?: number | null;
    dobYear?: number | null;
    sex?: string | null;
    stateOfOrigin?: string | null;
    lgaOfOrigin?: string | null;
    resHouseNo?: string | null;
    resStreet?: string | null;
    resArea?: string | null;
    resCity?: string | null;
    resCountry?: string | null;
    occupation?: string | null;
    photoUrl?: string | null;
    houseId?: string | null;
    privacyLevel: 'public' | 'public_to_members' | 'private';
}
export type ProfileDocument = Profile & Document;
export declare const ProfileSchema: import("mongoose").Schema<Profile, import("mongoose").Model<Profile, any, any, any, (Document<unknown, any, Profile, any, import("mongoose").DefaultSchemaOptions> & Profile & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Profile, any, import("mongoose").DefaultSchemaOptions> & Profile & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, Profile>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Profile, Document<unknown, {}, Profile, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    firstName?: import("mongoose").SchemaDefinitionProperty<string, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    middleName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastName?: import("mongoose").SchemaDefinitionProperty<string, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    dobDay?: import("mongoose").SchemaDefinitionProperty<number | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    dobMonth?: import("mongoose").SchemaDefinitionProperty<number | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    dobYear?: import("mongoose").SchemaDefinitionProperty<number | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sex?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    stateOfOrigin?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lgaOfOrigin?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    resHouseNo?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    resStreet?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    resArea?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    resCity?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    resCountry?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    occupation?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    photoUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    houseId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    privacyLevel?: import("mongoose").SchemaDefinitionProperty<"public" | "public_to_members" | "private", Profile, Document<unknown, {}, Profile, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Profile & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Profile>;
