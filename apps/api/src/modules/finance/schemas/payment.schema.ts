import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payment extends Document {
    @Prop({ type: String, required: true })
    payerUserId!: string;

    @Prop({ required: true })
    amount!: number;

    @Prop({ default: 'NGN' })
    currency!: string;

    @Prop({ required: true })
    channel!: string;

    @Prop()
    reference?: string;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scopeType?: 'global' | 'branch' | 'class';

    @Prop({ type: String })
    scopeId?: string | null;

    @Prop()
    notes?: string;

    @Prop({
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed',
    })
    status!: 'pending' | 'completed';

    @Prop({ type: Date })
    paidAt?: Date;

    @Prop({
        type: [
            {
                invoiceId: { type: Types.ObjectId, ref: 'DuesInvoice' },
                amount: { type: Number },
            },
        ],
        default: [],
    })
    applications!: { invoiceId: Types.ObjectId; amount: number }[];
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ payerUserId: 1, paidAt: -1, createdAt: -1 });
PaymentSchema.index({ paidAt: -1, createdAt: -1 });
PaymentSchema.index({ 'applications.invoiceId': 1 });
