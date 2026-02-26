import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'user_branch_memberships' })
export class BranchMembership extends Document {
    @Prop({ required: true, index: true })
    userId!: string;

    @Prop({ required: true, index: true })
    branchId!: string;

    @Prop({
        type: String,
        enum: ['requested', 'approved', 'rejected', 'ended'],
        default: 'requested',
    })
    status!: 'requested' | 'approved' | 'rejected' | 'ended';

    @Prop({ type: Date })
    requestedAt?: Date;

    @Prop({ type: String })
    approvedBy?: string | null;

    @Prop({ type: Date })
    approvedAt?: Date | null;

    @Prop({ type: Date })
    endedAt?: Date | null;

    @Prop({ type: String })
    note?: string | null;
}

export type BranchMembershipDocument = BranchMembership & Document;

export const BranchMembershipSchema =
    SchemaFactory.createForClass(BranchMembership);
BranchMembershipSchema.index({ userId: 1, branchId: 1 }, { unique: true });
