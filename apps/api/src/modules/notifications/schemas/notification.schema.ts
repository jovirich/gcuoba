import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends Document {
    @Prop({ required: true, index: true })
    userId!: string;

    @Prop({ required: true })
    title!: string;

    @Prop({ required: true })
    message!: string;

    @Prop({
        type: String,
        enum: ['info', 'success', 'warning', 'action_required'],
        default: 'info',
    })
    type!: 'info' | 'success' | 'warning' | 'action_required';

    @Prop({ type: Date, default: null })
    readAt?: Date | null;

    @Prop({ type: SchemaTypes.Mixed, default: null })
    metadata?: Record<string, unknown> | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
