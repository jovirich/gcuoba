import { Document } from 'mongoose';
export declare class Role extends Document {
    code: string;
    name: string;
    scope: 'global' | 'branch' | 'class';
}
export type RoleDocument = Role & Document;
export declare const RoleSchema: import("mongoose").Schema<Role, import("mongoose").Model<Role, any, any, any, (Document<unknown, any, Role, any, import("mongoose").DefaultSchemaOptions> & Role & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Role, any, import("mongoose").DefaultSchemaOptions> & Role & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, Role>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Role, Document<unknown, {}, Role, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Role & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Role, Document<unknown, {}, Role, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Role & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Role, Document<unknown, {}, Role, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Role & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    code?: import("mongoose").SchemaDefinitionProperty<string, Role, Document<unknown, {}, Role, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Role & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", Role, Document<unknown, {}, Role, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Role & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Role>;
