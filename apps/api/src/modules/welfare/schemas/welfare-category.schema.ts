import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'welfare_categories' })
export class WelfareCategory extends Document {
    @Prop({ required: true })
    name!: string;

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

export const WelfareCategorySchema =
    SchemaFactory.createForClass(WelfareCategory);
