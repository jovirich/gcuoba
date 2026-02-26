import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
    timestamps: { createdAt: 'joinedAt', updatedAt: 'updatedAt' },
    collection: 'user_class_membership',
})
export class ClassMembership extends Document {
    @Prop({ required: true, unique: true })
    userId!: string;

    @Prop({ required: true })
    classId!: string;

    @Prop({ type: Date })
    joinedAt?: Date;

    @Prop({ type: Date })
    updatedAt?: Date;
}

export type ClassMembershipDocument = ClassMembership & Document;

export const ClassMembershipSchema =
    SchemaFactory.createForClass(ClassMembership);
