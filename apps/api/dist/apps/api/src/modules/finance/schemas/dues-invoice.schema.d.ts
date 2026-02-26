import { Document, Types } from 'mongoose';
export declare class DuesInvoice extends Document {
    schemeId: Types.ObjectId;
    userId: string;
    amount: number;
    currency: string;
    periodStart?: Date;
    periodEnd?: Date;
    status: 'unpaid' | 'part_paid' | 'paid';
    paidAmount: number;
}
export type DuesInvoiceDocument = DuesInvoice & Document;
export declare const DuesInvoiceSchema: import("mongoose").Schema<DuesInvoice, import("mongoose").Model<DuesInvoice, any, any, any, (Document<unknown, any, DuesInvoice, any, import("mongoose").DefaultSchemaOptions> & DuesInvoice & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, DuesInvoice, any, import("mongoose").DefaultSchemaOptions> & DuesInvoice & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, DuesInvoice>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DuesInvoice, Document<unknown, {}, DuesInvoice, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"unpaid" | "part_paid" | "paid", DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    schemeId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    periodStart?: import("mongoose").SchemaDefinitionProperty<Date | undefined, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    periodEnd?: import("mongoose").SchemaDefinitionProperty<Date | undefined, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paidAmount?: import("mongoose").SchemaDefinitionProperty<number, DuesInvoice, Document<unknown, {}, DuesInvoice, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DuesInvoice & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, DuesInvoice>;
