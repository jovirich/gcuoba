import { Document, Types } from 'mongoose';
export declare class RoleAssignment extends Document {
    roleId?: Types.ObjectId;
    userId: string;
    roleCode: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
    startDate?: Date;
    endDate?: Date | null;
}
export type RoleAssignmentDocument = RoleAssignment & Document;
export declare const RoleAssignmentSchema: import("mongoose").Schema<RoleAssignment, import("mongoose").Model<RoleAssignment, any, any, any, (Document<unknown, any, RoleAssignment, any, import("mongoose").DefaultSchemaOptions> & RoleAssignment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, RoleAssignment, any, import("mongoose").DefaultSchemaOptions> & RoleAssignment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}), any, RoleAssignment>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RoleAssignment, Document<unknown, {}, RoleAssignment, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    roleId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | undefined, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    roleCode?: import("mongoose").SchemaDefinitionProperty<string, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    startDate?: import("mongoose").SchemaDefinitionProperty<Date | undefined, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    endDate?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, RoleAssignment, Document<unknown, {}, RoleAssignment, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<RoleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, RoleAssignment>;
