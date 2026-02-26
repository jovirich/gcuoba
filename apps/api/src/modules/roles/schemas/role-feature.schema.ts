import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'role_features',
})
export class RoleFeature extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Role', required: true, index: true })
    roleId!: Types.ObjectId;

    @Prop({ required: true, trim: true, index: true })
    moduleKey!: string;

    @Prop({ type: Boolean, default: true })
    allowed!: boolean;
}

export type RoleFeatureDocument = RoleFeature & Document;

export const RoleFeatureSchema = SchemaFactory.createForClass(RoleFeature);

RoleFeatureSchema.index({ roleId: 1, moduleKey: 1 }, { unique: true });
