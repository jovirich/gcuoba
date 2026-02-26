import { Document, Types } from 'mongoose';
export declare class PaymentReceipt extends Document {
    paymentId: Types.ObjectId;
    receiptNo: string;
    issuedAt: Date;
}
export type PaymentReceiptDocument = PaymentReceipt & Document;
export declare const PaymentReceiptSchema: import("mongoose").Schema<PaymentReceipt, import("mongoose").Model<PaymentReceipt, any, any, any, (Document<unknown, any, PaymentReceipt, any, import("mongoose").DefaultSchemaOptions> & PaymentReceipt & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, PaymentReceipt, any, import("mongoose").DefaultSchemaOptions> & PaymentReceipt & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, PaymentReceipt>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentReceipt, Document<unknown, {}, PaymentReceipt, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PaymentReceipt & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, PaymentReceipt, Document<unknown, {}, PaymentReceipt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentReceipt & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, PaymentReceipt, Document<unknown, {}, PaymentReceipt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentReceipt & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    receiptNo?: import("mongoose").SchemaDefinitionProperty<string, PaymentReceipt, Document<unknown, {}, PaymentReceipt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentReceipt & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    issuedAt?: import("mongoose").SchemaDefinitionProperty<Date, PaymentReceipt, Document<unknown, {}, PaymentReceipt, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentReceipt & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, PaymentReceipt>;
