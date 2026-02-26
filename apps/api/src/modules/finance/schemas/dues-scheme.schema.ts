import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DuesScheme extends Document {
    @Prop({ required: true })
    title!: string;

    @Prop({ required: true })
    amount!: number;

    @Prop({ default: 'NGN' })
    currency!: string;

    @Prop({
        type: String,
        enum: ['monthly', 'quarterly', 'annual', 'one_off'],
        default: 'annual',
    })
    frequency!: 'monthly' | 'quarterly' | 'annual' | 'one_off';

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scope_type!: 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scope_id?: string | null;

    @Prop({ default: 'active' })
    status!: 'active' | 'inactive';
}

export type DuesSchemeDocument = DuesScheme & Document;

export const DuesSchemeSchema = SchemaFactory.createForClass(DuesScheme);
