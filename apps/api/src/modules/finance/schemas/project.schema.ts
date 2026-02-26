import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Project extends Document {
    @Prop({ required: true })
    name!: string;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scope_type!: 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scope_id?: string | null;

    @Prop({ type: Number, default: 0 })
    budget?: number | null;

    @Prop({ type: Number, default: 0 })
    actual_spend!: number;

    @Prop({ type: Date })
    start_date?: Date;

    @Prop({ type: Date })
    end_date?: Date;

    @Prop({
        type: String,
        enum: ['planning', 'active', 'completed'],
        default: 'planning',
    })
    status!: 'planning' | 'active' | 'completed';

    @Prop({ type: String, default: null })
    owner_id?: string | null;
}

export type ProjectDocument = Project & Document;
export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ scope_type: 1, scope_id: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, createdAt: -1 });
