import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'welfare_cases' })
export class WelfareCase extends Document {
    @Prop({ required: true })
    title!: string;

    @Prop({ required: true })
    description!: string;

    @Prop({ required: true })
    categoryId!: string;

    @Prop({ required: true })
    scopeType!: 'global' | 'branch' | 'class';

    @Prop()
    scopeId?: string;

    @Prop({ default: 0 })
    targetAmount!: number;

    @Prop({ default: 'NGN' })
    currency!: string;

    @Prop({ default: 'open' })
    status!: 'open' | 'closed';

    @Prop({ default: 0 })
    totalRaised?: number;

    @Prop({ default: 0 })
    totalDisbursed?: number;

    @Prop()
    beneficiaryName?: string;

    @Prop()
    beneficiaryUserId?: string;
}

export const WelfareCaseSchema = SchemaFactory.createForClass(WelfareCase);

WelfareCaseSchema.index({ status: 1, scopeType: 1, scopeId: 1, createdAt: -1 });
