import { Document, Types } from 'mongoose';
export declare class Payment extends Document {
    payerUserId: string;
    amount: number;
    currency: string;
    channel: string;
    reference?: string;
    scopeType?: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    notes?: string;
    status: 'pending' | 'completed';
    paidAt?: Date;
    applications: {
        invoiceId: Types.ObjectId;
        amount: number;
    }[];
}
export type PaymentDocument = Payment & Document;
export declare const PaymentSchema: import("mongoose").Schema<Payment, import("mongoose").Model<Payment, any, any, any, (Document<unknown, any, Payment, any, import("mongoose").DefaultSchemaOptions> & Payment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Payment, any, import("mongoose").DefaultSchemaOptions> & Payment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, Payment>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Payment, Document<unknown, {}, Payment, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"pending" | "completed", Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class" | undefined, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    payerUserId?: import("mongoose").SchemaDefinitionProperty<string, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    channel?: import("mongoose").SchemaDefinitionProperty<string, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    reference?: import("mongoose").SchemaDefinitionProperty<string | undefined, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | undefined, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paidAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    applications?: import("mongoose").SchemaDefinitionProperty<{
        invoiceId: Types.ObjectId;
        amount: number;
    }[], Payment, Document<unknown, {}, Payment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Payment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Payment>;
