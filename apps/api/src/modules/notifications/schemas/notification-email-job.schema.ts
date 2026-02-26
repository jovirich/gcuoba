import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'notification_email_jobs' })
export class NotificationEmailJob extends Document {
    @Prop({ type: String, default: null })
    notificationId?: string | null;

    @Prop({ required: true, index: true })
    userId!: string;

    @Prop({ required: true })
    toEmail!: string;

    @Prop({ required: true })
    subject!: string;

    @Prop({ required: true })
    body!: string;

    @Prop({
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
    })
    status!: 'pending' | 'sent' | 'failed';

    @Prop({ default: 0 })
    attempts!: number;

    @Prop({ type: String, default: null })
    lastError?: string | null;

    @Prop({ type: Date, default: null })
    sentAt?: Date | null;

    @Prop({ type: Date, default: null })
    nextAttemptAt?: Date | null;
}

export const NotificationEmailJobSchema =
    SchemaFactory.createForClass(NotificationEmailJob);

NotificationEmailJobSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
NotificationEmailJobSchema.index({ userId: 1, createdAt: -1 });
