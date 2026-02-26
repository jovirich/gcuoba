import { Document } from 'mongoose';
export declare class NotificationEmailJob extends Document {
    notificationId?: string | null;
    userId: string;
    toEmail: string;
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    attempts: number;
    lastError?: string | null;
    sentAt?: Date | null;
    nextAttemptAt?: Date | null;
}
export declare const NotificationEmailJobSchema: import("mongoose").Schema<NotificationEmailJob, import("mongoose").Model<NotificationEmailJob, any, any, any, (Document<unknown, any, NotificationEmailJob, any, import("mongoose").DefaultSchemaOptions> & NotificationEmailJob & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, NotificationEmailJob, any, import("mongoose").DefaultSchemaOptions> & NotificationEmailJob & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, NotificationEmailJob>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"pending" | "sent" | "failed", NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notificationId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    toEmail?: import("mongoose").SchemaDefinitionProperty<string, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    subject?: import("mongoose").SchemaDefinitionProperty<string, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    body?: import("mongoose").SchemaDefinitionProperty<string, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    attempts?: import("mongoose").SchemaDefinitionProperty<number, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    lastError?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sentAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    nextAttemptAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, NotificationEmailJob, Document<unknown, {}, NotificationEmailJob, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<NotificationEmailJob & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, NotificationEmailJob>;
