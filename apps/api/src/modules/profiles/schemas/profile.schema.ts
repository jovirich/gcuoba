import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'profiles' })
export class Profile extends Document {
    @Prop({ required: true, unique: true })
    userId!: string;

    @Prop()
    title?: string;

    @Prop({ required: true })
    firstName!: string;

    @Prop({ type: String, default: null })
    middleName?: string | null;

    @Prop({ required: true })
    lastName!: string;

    @Prop({ type: Number, min: 1, max: 31 })
    dobDay?: number | null;

    @Prop({ type: Number, min: 1, max: 12 })
    dobMonth?: number | null;

    @Prop({ type: Number, min: 1900, max: 2100 })
    dobYear?: number | null;

    @Prop({ type: String, default: null })
    sex?: string | null;

    @Prop({ type: String, default: null })
    stateOfOrigin?: string | null;

    @Prop({ type: String, default: null })
    lgaOfOrigin?: string | null;

    @Prop({ type: String, default: null })
    resHouseNo?: string | null;

    @Prop({ type: String, default: null })
    resStreet?: string | null;

    @Prop({ type: String, default: null })
    resArea?: string | null;

    @Prop({ type: String, default: null })
    resCity?: string | null;

    @Prop({ type: String, default: null })
    resCountry?: string | null;

    @Prop({ type: String, default: null })
    occupation?: string | null;

    @Prop({ type: String, default: null })
    photoUrl?: string | null;

    @Prop({ type: String, default: null })
    houseId?: string | null;

    @Prop({
        type: String,
        enum: ['public', 'public_to_members', 'private'],
        default: 'public_to_members',
    })
    privacyLevel!: 'public' | 'public_to_members' | 'private';
}

export type ProfileDocument = Profile & Document;

export const ProfileSchema = SchemaFactory.createForClass(Profile);
