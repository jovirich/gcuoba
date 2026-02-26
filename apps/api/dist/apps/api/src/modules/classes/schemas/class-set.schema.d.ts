import { Document } from 'mongoose';
export declare class ClassSet extends Document {
    label: string;
    entryYear: number;
    status: 'active' | 'inactive';
}
export type ClassSetDocument = ClassSet & Document;
export declare const ClassSetSchema: import("mongoose").Schema<ClassSet, import("mongoose").Model<ClassSet, any, any, any, (Document<unknown, any, ClassSet, any, import("mongoose").DefaultSchemaOptions> & ClassSet & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, ClassSet, any, import("mongoose").DefaultSchemaOptions> & ClassSet & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, ClassSet>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ClassSet, Document<unknown, {}, ClassSet, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ClassSet & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, ClassSet, Document<unknown, {}, ClassSet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassSet & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "inactive", ClassSet, Document<unknown, {}, ClassSet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassSet & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    label?: import("mongoose").SchemaDefinitionProperty<string, ClassSet, Document<unknown, {}, ClassSet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassSet & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    entryYear?: import("mongoose").SchemaDefinitionProperty<number, ClassSet, Document<unknown, {}, ClassSet, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassSet & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ClassSet>;
