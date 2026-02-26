import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog extends Document {
    @Prop({ required: true, index: true })
    actorUserId!: string;

    @Prop({ required: true })
    action!: string;

    @Prop({ required: true })
    resourceType!: string;

    @Prop({ type: String, default: null })
    resourceId?: string | null;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class', 'private'],
        default: null,
    })
    scopeType?: 'global' | 'branch' | 'class' | 'private' | null;

    @Prop({ type: String, default: null })
    scopeId?: string | null;

    @Prop({ type: SchemaTypes.Mixed, default: null })
    metadata?: Record<string, unknown> | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1, action: 1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ scopeType: 1, scopeId: 1, createdAt: -1 });
