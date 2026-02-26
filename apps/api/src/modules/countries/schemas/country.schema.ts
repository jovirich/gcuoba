import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'countries' })
export class Country extends Document {
    @Prop({ required: true, unique: true, trim: true })
    name!: string;

    @Prop({ type: String, uppercase: true, maxlength: 3, default: null })
    isoCode?: string | null;
}

export type CountryDocument = Country & Document;

export const CountrySchema = SchemaFactory.createForClass(Country);
