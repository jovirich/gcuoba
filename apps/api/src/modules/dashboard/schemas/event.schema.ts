import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'events' })
export class DashboardEvent extends Document {
    @Prop({ required: true })
    title!: string;

    @Prop({ type: String, default: null })
    description?: string | null;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scopeType!: 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scopeId?: string | null;

    @Prop({ type: String, default: null })
    location?: string | null;

    @Prop({ type: Date, required: true })
    startAt!: Date;

    @Prop({ type: Date })
    endAt?: Date;

    @Prop({
        type: String,
        enum: ['draft', 'published', 'cancelled'],
        default: 'draft',
    })
    status!: 'draft' | 'published' | 'cancelled';
}

export type DashboardEventDocument = DashboardEvent & Document;

export const EventSchema = SchemaFactory.createForClass(DashboardEvent);

EventSchema.index({ status: 1, startAt: 1, createdAt: -1 });
EventSchema.index({
    scopeType: 1,
    scopeId: 1,
    status: 1,
    startAt: 1,
    createdAt: -1,
});
