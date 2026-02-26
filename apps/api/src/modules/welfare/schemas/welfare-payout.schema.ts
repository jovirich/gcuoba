import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'welfare_payouts' })
export class WelfarePayout extends Document {
    @Prop({ required: true }) caseId!: string;
    @Prop({ type: String, default: null }) beneficiaryUserId?: string | null;
    @Prop({ required: true }) amount!: number;
    @Prop({ default: 'NGN' }) currency!: string;
    @Prop({ required: true }) channel!: string;
    @Prop() reference?: string;
    @Prop() notes?: string;
    @Prop({ type: Date }) disbursedAt?: Date;
    @Prop({
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    })
    status!: 'pending' | 'approved' | 'rejected';
    @Prop({ type: String, default: null }) reviewedBy?: string | null;
    @Prop({ type: Date, default: null }) reviewedAt?: Date | null;
    @Prop({ type: String, default: null }) reviewNote?: string | null;
}

export const WelfarePayoutSchema = SchemaFactory.createForClass(WelfarePayout);
WelfarePayoutSchema.index({ status: 1, caseId: 1, createdAt: -1 });
