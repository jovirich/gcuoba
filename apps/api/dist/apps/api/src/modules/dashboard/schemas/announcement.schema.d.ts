import { Document } from 'mongoose';
export declare class Announcement extends Document {
    title: string;
    body: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    status: 'draft' | 'published';
    publishedAt?: Date;
}
export type AnnouncementDocument = Announcement & Document;
export declare const AnnouncementSchema: import("mongoose").Schema<Announcement, import("mongoose").Model<Announcement, any, any, any, (Document<unknown, any, Announcement, any, import("mongoose").DefaultSchemaOptions> & Announcement & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Announcement, any, import("mongoose").DefaultSchemaOptions> & Announcement & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, Announcement>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Announcement, Document<unknown, {}, Announcement, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"draft" | "published", Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    body?: import("mongoose").SchemaDefinitionProperty<string, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    publishedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Announcement, Document<unknown, {}, Announcement, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Announcement & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Announcement>;
