import { Document } from 'mongoose';
export declare class House extends Document {
    name: string;
    motto?: string | null;
}
export type HouseDocument = House & Document;
export declare const HouseSchema: import("mongoose").Schema<House, import("mongoose").Model<House, any, any, any, (Document<unknown, any, House, any, import("mongoose").DefaultSchemaOptions> & House & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, House, any, import("mongoose").DefaultSchemaOptions> & House & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, House>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, House, Document<unknown, {}, House, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<House & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, House, Document<unknown, {}, House, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<House & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, House, Document<unknown, {}, House, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<House & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    motto?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, House, Document<unknown, {}, House, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<House & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, House>;
