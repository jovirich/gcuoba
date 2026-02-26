import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class DuesInvoice extends Document {
    @Prop({ type: Types.ObjectId, ref: 'DuesScheme', required: true })
    schemeId!: Types.ObjectId;

    @Prop({ type: String, required: true })
    userId!: string;

    @Prop({ required: true })
    amount!: number;

    @Prop({ default: 'NGN' })
    currency!: string;

    @Prop({ type: Date })
    periodStart?: Date;

    @Prop({ type: Date })
    periodEnd?: Date;

    @Prop({
        type: String,
        enum: ['unpaid', 'part_paid', 'paid'],
        default: 'unpaid',
    })
    status!: 'unpaid' | 'part_paid' | 'paid';

    @Prop({ default: 0 })
    paidAmount!: number;
}

export type DuesInvoiceDocument = DuesInvoice & Document;

export const DuesInvoiceSchema = SchemaFactory.createForClass(DuesInvoice);

DuesInvoiceSchema.index({
    userId: 1,
    status: 1,
    periodStart: -1,
    createdAt: -1,
});
DuesInvoiceSchema.index({ createdAt: -1 });
DuesInvoiceSchema.index({ schemeId: 1, userId: 1, periodStart: 1 });
