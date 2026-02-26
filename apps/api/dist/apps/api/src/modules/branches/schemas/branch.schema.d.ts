import { Document } from 'mongoose';
export declare class Branch extends Document {
    name: string;
    country?: string;
}
export type BranchDocument = Branch & Document;
export declare const BranchSchema: import("mongoose").Schema<Branch, import("mongoose").Model<Branch, any, any, any, (Document<unknown, any, Branch, any, import("mongoose").DefaultSchemaOptions> & Branch & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Branch, any, import("mongoose").DefaultSchemaOptions> & Branch & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, Branch>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Branch, Document<unknown, {}, Branch, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Branch & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Branch, Document<unknown, {}, Branch, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Branch & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Branch, Document<unknown, {}, Branch, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Branch & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    country?: import("mongoose").SchemaDefinitionProperty<string | undefined, Branch, Document<unknown, {}, Branch, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Branch & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Branch>;
