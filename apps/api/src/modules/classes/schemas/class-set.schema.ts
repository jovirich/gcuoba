import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'classes' })
export class ClassSet extends Document {
    @Prop({ required: true })
    label!: string;

    @Prop({ required: true })
    entryYear!: number;

    @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' })
    status!: 'active' | 'inactive';
}

export type ClassSetDocument = ClassSet & Document;

export const ClassSetSchema = SchemaFactory.createForClass(ClassSet);
