import { Document } from 'mongoose';
export declare class BranchMembership extends Document {
    userId: string;
    branchId: string;
    status: 'requested' | 'approved' | 'rejected' | 'ended';
    requestedAt?: Date;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    endedAt?: Date | null;
    note?: string | null;
}
export type BranchMembershipDocument = BranchMembership & Document;
export declare const BranchMembershipSchema: import("mongoose").Schema<BranchMembership, import("mongoose").Model<BranchMembership, any, any, any, (Document<unknown, any, BranchMembership, any, import("mongoose").DefaultSchemaOptions> & BranchMembership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, BranchMembership, any, import("mongoose").DefaultSchemaOptions> & BranchMembership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, BranchMembership>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BranchMembership, Document<unknown, {}, BranchMembership, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"requested" | "approved" | "rejected" | "ended", BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    branchId?: import("mongoose").SchemaDefinitionProperty<string, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    note?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    requestedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    approvedBy?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    approvedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, BranchMembership, Document<unknown, {}, BranchMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BranchMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, BranchMembership>;
