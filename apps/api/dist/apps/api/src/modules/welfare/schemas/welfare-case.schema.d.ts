import { Document } from 'mongoose';
export declare class WelfareCase extends Document {
    title: string;
    description: string;
    categoryId: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string;
    targetAmount: number;
    currency: string;
    status: 'open' | 'closed';
    totalRaised?: number;
    totalDisbursed?: number;
    beneficiaryName?: string;
    beneficiaryUserId?: string;
}
export declare const WelfareCaseSchema: import("mongoose").Schema<WelfareCase, import("mongoose").Model<WelfareCase, any, any, any, (Document<unknown, any, WelfareCase, any, import("mongoose").DefaultSchemaOptions> & WelfareCase & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, WelfareCase, any, import("mongoose").DefaultSchemaOptions> & WelfareCase & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, WelfareCase>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WelfareCase, Document<unknown, {}, WelfareCase, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"open" | "closed", WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    beneficiaryUserId?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    categoryId?: import("mongoose").SchemaDefinitionProperty<string, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    targetAmount?: import("mongoose").SchemaDefinitionProperty<number, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    beneficiaryName?: import("mongoose").SchemaDefinitionProperty<string | undefined, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalRaised?: import("mongoose").SchemaDefinitionProperty<number | undefined, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalDisbursed?: import("mongoose").SchemaDefinitionProperty<number | undefined, WelfareCase, Document<unknown, {}, WelfareCase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCase & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, WelfareCase>;
