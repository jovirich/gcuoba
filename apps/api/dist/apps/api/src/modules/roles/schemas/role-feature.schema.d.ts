import { Document, Types } from 'mongoose';
export declare class RoleFeature extends Document {
    roleId: Types.ObjectId;
    moduleKey: string;
    allowed: boolean;
}
export type RoleFeatureDocument = RoleFeature & Document;
export declare const RoleFeatureSchema: import("mongoose").Schema<RoleFeature, import("mongoose").Model<RoleFeature, any, any, any, (Document<unknown, any, RoleFeature, any, import("mongoose").DefaultSchemaOptions> & RoleFeature & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, RoleFeature, any, import("mongoose").DefaultSchemaOptions> & RoleFeature & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, RoleFeature>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RoleFeature, Document<unknown, {}, RoleFeature, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<RoleFeature & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, RoleFeature, Document<unknown, {}, RoleFeature, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleFeature & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    roleId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, RoleFeature, Document<unknown, {}, RoleFeature, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleFeature & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    moduleKey?: import("mongoose").SchemaDefinitionProperty<string, RoleFeature, Document<unknown, {}, RoleFeature, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleFeature & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    allowed?: import("mongoose").SchemaDefinitionProperty<boolean, RoleFeature, Document<unknown, {}, RoleFeature, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleFeature & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, RoleFeature>;
