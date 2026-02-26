import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'document_records' })
export class DocumentRecord extends Document {
    @Prop({ required: true, index: true })
    ownerUserId!: string;

    @Prop({
        type: String,
        enum: ['private', 'global', 'branch', 'class'],
        required: true,
    })
    scopeType!: 'private' | 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scopeId?: string | null;

    @Prop({ required: true })
    originalName!: string;

    @Prop({ required: true })
    storedName!: string;

    @Prop({ required: true })
    storagePath!: string;

    @Prop({ required: true })
    mimeType!: string;

    @Prop({ required: true })
    sizeBytes!: number;

    @Prop({
        type: String,
        enum: ['private', 'scope', 'public'],
        default: 'private',
    })
    visibility!: 'private' | 'scope' | 'public';
}

export const DocumentRecordSchema =
    SchemaFactory.createForClass(DocumentRecord);

DocumentRecordSchema.index({ ownerUserId: 1, createdAt: -1 });
DocumentRecordSchema.index({
    scopeType: 1,
    scopeId: 1,
    visibility: 1,
    createdAt: -1,
});
