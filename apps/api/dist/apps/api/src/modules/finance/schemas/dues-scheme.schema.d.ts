import { Document } from 'mongoose';
export declare class DuesScheme extends Document {
    title: string;
    amount: number;
    currency: string;
    frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
    scope_type: 'global' | 'branch' | 'class';
    scope_id?: string | null;
    status: 'active' | 'inactive';
}
export type DuesSchemeDocument = DuesScheme & Document;
export declare const DuesSchemeSchema: import("mongoose").Schema<DuesScheme, import("mongoose").Model<DuesScheme, any, any, any, (Document<unknown, any, DuesScheme, any, import("mongoose").DefaultSchemaOptions> & DuesScheme & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, DuesScheme, any, import("mongoose").DefaultSchemaOptions> & DuesScheme & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, DuesScheme>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DuesScheme, Document<unknown, {}, DuesScheme, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "inactive", DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    frequency?: import("mongoose").SchemaDefinitionProperty<"monthly" | "quarterly" | "annual" | "one_off", DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_type?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_id?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, DuesScheme, Document<unknown, {}, DuesScheme, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesScheme & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, DuesScheme>;
