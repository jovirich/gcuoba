import { Document } from 'mongoose';
export declare class WelfareCategory extends Document {
    name: string;
    scope_type: 'global' | 'branch' | 'class';
    scope_id?: string | null;
    status: 'active' | 'inactive';
}
export declare const WelfareCategorySchema: import("mongoose").Schema<WelfareCategory, import("mongoose").Model<WelfareCategory, any, any, any, (Document<unknown, any, WelfareCategory, any, import("mongoose").DefaultSchemaOptions> & WelfareCategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, WelfareCategory, any, import("mongoose").DefaultSchemaOptions> & WelfareCategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, WelfareCategory>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WelfareCategory, Document<unknown, {}, WelfareCategory, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, WelfareCategory, Document<unknown, {}, WelfareCategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, WelfareCategory, Document<unknown, {}, WelfareCategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "inactive", WelfareCategory, Document<unknown, {}, WelfareCategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_type?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", WelfareCategory, Document<unknown, {}, WelfareCategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_id?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, WelfareCategory, Document<unknown, {}, WelfareCategory, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<WelfareCategory & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, WelfareCategory>;
