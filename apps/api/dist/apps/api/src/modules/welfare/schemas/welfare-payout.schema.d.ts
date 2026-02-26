import { Document } from 'mongoose';
export declare class WelfarePayout extends Document {
    caseId: string;
    beneficiaryUserId?: string | null;
    amount: number;
    currency: string;
    channel: string;
    reference?: string;
    notes?: string;
    disbursedAt?: Date;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
    reviewNote?: string | null;
}
export declare const WelfarePayoutSchema: import("mongoose").Schema<WelfarePayout, import("mongoose").Model<WelfarePayout, any, any, any, (Document<unknown, any, WelfarePayout, any, import("mongoose").DefaultSchemaOptions> & WelfarePayout & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, WelfarePayout, any, import("mongoose").DefaultSchemaOptions> & WelfarePayout & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, WelfarePayout>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WelfarePayout, Document<unknown, {}, WelfarePayout, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"pending" | "approved" | "rejected", WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    caseId?: import("mongoose").SchemaDefinitionProperty<string, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewedBy?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewNote?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    beneficiaryUserId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    channel?: import("mongoose").SchemaDefinitionProperty<string, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reference?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    disbursedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, WelfarePayout, Document<unknown, {}, WelfarePayout, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfarePayout & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, WelfarePayout>;
