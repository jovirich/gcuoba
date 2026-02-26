import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'role_assignments',
})
export class RoleAssignment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Role' })
    roleId?: Types.ObjectId;

    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    roleCode!: string;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    })
    scopeType!: 'global' | 'branch' | 'class';

    @Prop({ type: String })
    scopeId?: string | null;

    @Prop({ type: Date })
    startDate?: Date;

    @Prop({ type: Date })
    endDate?: Date | null;
}

export type RoleAssignmentDocument = RoleAssignment & Document;

export const RoleAssignmentSchema =
    SchemaFactory.createForClass(RoleAssignment);
