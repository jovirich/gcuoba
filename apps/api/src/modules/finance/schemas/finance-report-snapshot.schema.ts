import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
    timestamps: false,
    collection: 'finance_report_snapshots',
})
export class FinanceReportSnapshot extends Document {
    @Prop({ required: true })
    period!: string;

    @Prop({ required: true })
    year!: number;

    @Prop({ required: true })
    month!: number;

    @Prop({
        type: String,
        enum: ['global', 'branch', 'class'],
        required: true,
    })
    scopeType!: 'global' | 'branch' | 'class';

    @Prop({ type: String, default: null })
    scopeId?: string | null;

    @Prop({ type: Object, default: {} })
    totalsByCurrency!: Record<
        string,
        { billed: number; paid: number; outstanding: number }
    >;

    @Prop({ type: Number, default: 0 })
    rowCount!: number;

    @Prop({ type: Date, default: () => new Date() })
    generatedAt!: Date;
}

export type FinanceReportSnapshotDocument = FinanceReportSnapshot & Document;

export const FinanceReportSnapshotSchema = SchemaFactory.createForClass(
    FinanceReportSnapshot,
);

FinanceReportSnapshotSchema.index(
    { period: 1, scopeType: 1, scopeId: 1 },
    { unique: true },
);
FinanceReportSnapshotSchema.index({ generatedAt: -1, period: -1 });
