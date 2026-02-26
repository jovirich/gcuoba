import { Document } from 'mongoose';
export declare class FinanceReportSnapshot extends Document {
    period: string;
    year: number;
    month: number;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    totalsByCurrency: Record<string, {
        billed: number;
        paid: number;
        outstanding: number;
    }>;
    rowCount: number;
    generatedAt: Date;
}
export type FinanceReportSnapshotDocument = FinanceReportSnapshot & Document;
export declare const FinanceReportSnapshotSchema: import("mongoose").Schema<FinanceReportSnapshot, import("mongoose").Model<FinanceReportSnapshot, any, any, any, (Document<unknown, any, FinanceReportSnapshot, any, import("mongoose").DefaultSchemaOptions> & FinanceReportSnapshot & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, FinanceReportSnapshot, any, import("mongoose").DefaultSchemaOptions> & FinanceReportSnapshot & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, FinanceReportSnapshot>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    period?: import("mongoose").SchemaDefinitionProperty<string, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    year?: import("mongoose").SchemaDefinitionProperty<number, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    month?: import("mongoose").SchemaDefinitionProperty<number, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalsByCurrency?: import("mongoose").SchemaDefinitionProperty<Record<string, {
        billed: number;
        paid: number;
        outstanding: number;
    }>, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rowCount?: import("mongoose").SchemaDefinitionProperty<number, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    generatedAt?: import("mongoose").SchemaDefinitionProperty<Date, FinanceReportSnapshot, Document<unknown, {}, FinanceReportSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<FinanceReportSnapshot & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, FinanceReportSnapshot>;
