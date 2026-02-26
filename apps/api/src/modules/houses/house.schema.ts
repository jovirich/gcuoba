import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'houses', timestamps: true })
export class House extends Document {
    @Prop({ required: true, unique: true })
    name!: string;

    @Prop({ type: String, default: null })
    motto?: string | null;
}

export type HouseDocument = House & Document;

export const HouseSchema = SchemaFactory.createForClass(House);
