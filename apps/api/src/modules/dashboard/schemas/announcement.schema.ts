import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement extends Document {
    @Prop({ required: true })
    title!: string;

    @Prop({ required: true })
    body!: string;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scopeType!: 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scopeId?: string | null;

    @Prop({ type: String, enum: ['draft', 'published'], default: 'draft' })
    status!: 'draft' | 'published';

    @Prop({ type: Date, default: () => new Date() })
    publishedAt?: Date;
}

export type AnnouncementDocument = Announcement & Document;

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

AnnouncementSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
AnnouncementSchema.index({
    scopeType: 1,
    scopeId: 1,
    status: 1,
    publishedAt: -1,
    createdAt: -1,
});
