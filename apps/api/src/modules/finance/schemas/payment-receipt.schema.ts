import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Payment } from './payment.schema';

@Schema({ timestamps: false, collection: 'payment_receipts' })
export class PaymentReceipt extends Document {
    @Prop({ type: Types.ObjectId, ref: Payment.name, required: true })
    paymentId!: Types.ObjectId;

    @Prop({ required: true, unique: true })
    receiptNo!: string;

    @Prop({ type: Date, default: () => new Date() })
    issuedAt!: Date;
}

export type PaymentReceiptDocument = PaymentReceipt & Document;

export const PaymentReceiptSchema =
    SchemaFactory.createForClass(PaymentReceipt);
