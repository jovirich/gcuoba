import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'password_reset_tokens',
})
export class PasswordResetToken extends Document {
    @Prop({ required: true, lowercase: true, index: true })
    email!: string;

    @Prop({ required: true, index: true })
    tokenHash!: string;

    @Prop({ required: true })
    expiresAt!: Date;

    @Prop({ type: Date, default: null })
    usedAt?: Date | null;
}

export type PasswordResetTokenDocument = PasswordResetToken & Document;

export const PasswordResetTokenSchema =
    SchemaFactory.createForClass(PasswordResetToken);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
