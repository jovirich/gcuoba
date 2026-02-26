import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Branch extends Document {
    @Prop({ required: true })
    name!: string;

    @Prop()
    country?: string;
}

export type BranchDocument = Branch & Document;

export const BranchSchema = SchemaFactory.createForClass(Branch);
