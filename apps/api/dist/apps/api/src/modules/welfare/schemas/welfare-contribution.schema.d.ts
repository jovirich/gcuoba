import { Document } from 'mongoose';
export declare class WelfareContribution extends Document {
    caseId: string;
    userId?: string | null;
    contributorName: string;
    contributorEmail?: string;
    amount: number;
    currency: string;
    notes?: string;
    paidAt?: Date;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
    reviewNote?: string | null;
}
export declare const WelfareContributionSchema: import("mongoose").Schema<WelfareContribution, import("mongoose").Model<WelfareContribution, any, any, any, (Document<unknown, any, WelfareContribution, any, import("mongoose").DefaultSchemaOptions> & WelfareContribution & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, WelfareContribution, any, import("mongoose").DefaultSchemaOptions> & WelfareContribution & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, WelfareContribution>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WelfareContribution, Document<unknown, {}, WelfareContribution, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"pending" | "approved" | "rejected", WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    caseId?: import("mongoose").SchemaDefinitionProperty<string, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contributorName?: import("mongoose").SchemaDefinitionProperty<string, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    contributorEmail?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paidAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewedBy?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reviewNote?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfareContribution, Document<unknown, {}, WelfareContribution, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareContribution & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, WelfareContribution>;
