import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { MemberStatus } from '@gcuoba/types';

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true })
    name!: string;

    @Prop({ required: true, unique: true, lowercase: true })
    email!: string;

    @Prop({ type: Date, default: null })
    emailVerifiedAt?: Date | null;

    @Prop({ required: true })
    passwordHash!: string;

    @Prop({ type: String, default: null })
    phone?: string | null;

    @Prop({
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending',
    })
    status!: MemberStatus;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);
