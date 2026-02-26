import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'welfare_contributions' })
export class WelfareContribution extends Document {
    @Prop({ required: true }) caseId!: string;
    @Prop({ type: String, default: null }) userId?: string | null;
    @Prop({ required: true }) contributorName!: string;
    @Prop() contributorEmail?: string;
    @Prop({ required: true }) amount!: number;
    @Prop({ default: 'NGN' }) currency!: string;
    @Prop() notes?: string;
    @Prop({ type: Date }) paidAt?: Date;
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

export const WelfareContributionSchema =
    SchemaFactory.createForClass(WelfareContribution);

WelfareContributionSchema.index({ caseId: 1, paidAt: -1, createdAt: -1 });
WelfareContributionSchema.index({ userId: 1, paidAt: -1, createdAt: -1 });
WelfareContributionSchema.index({ status: 1, caseId: 1, createdAt: -1 });
