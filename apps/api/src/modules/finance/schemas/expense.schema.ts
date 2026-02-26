import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Expense extends Document {
    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scope_type!: 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scope_id?: string | null;

    @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
    project_id?: Types.ObjectId | null;

    @Prop({ required: true })
    title!: string;

    @Prop({ type: String, default: null })
    description?: string | null;

    @Prop({ type: String, default: null })
    notes?: string | null;

    @Prop({ required: true })
    amount!: number;

    @Prop({ default: 'NGN' })
    currency!: string;

    @Prop({
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    })
    status!: 'pending' | 'approved' | 'rejected';

    @Prop({
        type: String,
        enum: ['pending', 'finance_approved', 'approved', 'rejected'],
        default: 'pending',
    })
    approval_stage!: 'pending' | 'finance_approved' | 'approved' | 'rejected';

    @Prop({ type: String, default: null })
    submitted_by?: string | null;

    @Prop({ type: String, default: null })
    approved_by?: string | null;

    @Prop({ type: Date, default: null })
    approved_at?: Date | null;

    @Prop({ type: String, default: null })
    first_approved_by?: string | null;

    @Prop({ type: Date, default: null })
    first_approved_at?: Date | null;

    @Prop({ type: String, default: null })
    second_approved_by?: string | null;

    @Prop({ type: Date, default: null })
    second_approved_at?: Date | null;

    @Prop({ type: String, default: null })
    rejected_by?: string | null;

    @Prop({ type: Date, default: null })
    rejected_at?: Date | null;
}

export type ExpenseDocument = Expense & Document;
export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ scope_type: 1, scope_id: 1, createdAt: -1 });
ExpenseSchema.index({ approval_stage: 1, createdAt: -1 });
ExpenseSchema.index({ project_id: 1, createdAt: -1 });
