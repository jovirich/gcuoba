import { Document } from 'mongoose';
export declare class Country extends Document {
    name: string;
    isoCode?: string | null;
}
export type CountryDocument = Country & Document;
export declare const CountrySchema: import("mongoose").Schema<Country, import("mongoose").Model<Country, any, any, any, (Document<unknown, any, Country, any, import("mongoose").DefaultSchemaOptions> & Country & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Country, any, import("mongoose").DefaultSchemaOptions> & Country & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, Country>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Country, Document<unknown, {}, Country, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Country & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Country, Document<unknown, {}, Country, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Country & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, Country, Document<unknown, {}, Country, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Country & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isoCode?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Country, Document<unknown, {}, Country, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Country & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Country>;
