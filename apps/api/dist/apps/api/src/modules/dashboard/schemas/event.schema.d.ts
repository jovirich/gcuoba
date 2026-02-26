import { Document } from 'mongoose';
export declare class DashboardEvent extends Document {
    title: string;
    description?: string | null;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    location?: string | null;
    startAt: Date;
    endAt?: Date;
    status: 'draft' | 'published' | 'cancelled';
}
export type DashboardEventDocument = DashboardEvent & Document;
export declare const EventSchema: import("mongoose").Schema<DashboardEvent, import("mongoose").Model<DashboardEvent, any, any, any, (Document<unknown, any, DashboardEvent, any, import("mongoose").DefaultSchemaOptions> & DashboardEvent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, DashboardEvent, any, import("mongoose").DefaultSchemaOptions> & DashboardEvent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, DashboardEvent>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DashboardEvent, Document<unknown, {}, DashboardEvent, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"draft" | "published" | "cancelled", DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    location?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startAt?: import("mongoose").SchemaDefinitionProperty<Date, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, DashboardEvent, Document<unknown, {}, DashboardEvent, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DashboardEvent & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, DashboardEvent>;
