import { Document, Types } from 'mongoose';
export declare class Expense extends Document {
    scope_type: 'global' | 'branch' | 'class';
    scope_id?: string | null;
    project_id?: Types.ObjectId | null;
    title: string;
    description?: string | null;
    notes?: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected';
    approval_stage: 'pending' | 'finance_approved' | 'approved' | 'rejected';
    submitted_by?: string | null;
    approved_by?: string | null;
    approved_at?: Date | null;
    first_approved_by?: string | null;
    first_approved_at?: Date | null;
    second_approved_by?: string | null;
    second_approved_at?: Date | null;
    rejected_by?: string | null;
    rejected_at?: Date | null;
}
export type ExpenseDocument = Expense & Document;
export declare const ExpenseSchema: import("mongoose").Schema<Expense, import("mongoose").Model<Expense, any, any, any, (Document<unknown, any, Expense, any, import("mongoose").DefaultSchemaOptions> & Expense & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Expense, any, import("mongoose").DefaultSchemaOptions> & Expense & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, Expense>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Expense, Document<unknown, {}, Expense, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"pending" | "approved" | "rejected", Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_type?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_id?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    project_id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    approval_stage?: import("mongoose").SchemaDefinitionProperty<"pending" | "approved" | "rejected" | "finance_approved", Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    submitted_by?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    approved_by?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    approved_at?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    first_approved_by?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    first_approved_at?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    second_approved_by?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    second_approved_at?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rejected_by?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    rejected_at?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Expense, Document<unknown, {}, Expense, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Expense & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Expense>;
