import { Document } from 'mongoose';
export declare class PasswordResetToken extends Document {
    email: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt?: Date | null;
}
export type PasswordResetTokenDocument = PasswordResetToken & Document;
export declare const PasswordResetTokenSchema: import("mongoose").Schema<PasswordResetToken, import("mongoose").Model<PasswordResetToken, any, any, any, (Document<unknown, any, PasswordResetToken, any, import("mongoose").DefaultSchemaOptions> & PasswordResetToken & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, PasswordResetToken, any, import("mongoose").DefaultSchemaOptions> & PasswordResetToken & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, PasswordResetToken>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PasswordResetToken, Document<unknown, {}, PasswordResetToken, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PasswordResetToken & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, PasswordResetToken, Document<unknown, {}, PasswordResetToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PasswordResetToken & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, PasswordResetToken, Document<unknown, {}, PasswordResetToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PasswordResetToken & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    tokenHash?: import("mongoose").SchemaDefinitionProperty<string, PasswordResetToken, Document<unknown, {}, PasswordResetToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PasswordResetToken & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, PasswordResetToken, Document<unknown, {}, PasswordResetToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PasswordResetToken & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    usedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, PasswordResetToken, Document<unknown, {}, PasswordResetToken, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PasswordResetToken & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, PasswordResetToken>;
