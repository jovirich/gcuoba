import { Document } from 'mongoose';
export declare class ClassMembership extends Document {
    userId: string;
    classId: string;
    joinedAt?: Date;
    updatedAt?: Date;
}
export type ClassMembershipDocument = ClassMembership & Document;
export declare const ClassMembershipSchema: import("mongoose").Schema<ClassMembership, import("mongoose").Model<ClassMembership, any, any, any, (Document<unknown, any, ClassMembership, any, import("mongoose").DefaultSchemaOptions> & ClassMembership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, ClassMembership, any, import("mongoose").DefaultSchemaOptions> & ClassMembership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, ClassMembership>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ClassMembership, Document<unknown, {}, ClassMembership, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ClassMembership & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, ClassMembership, Document<unknown, {}, ClassMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<string, ClassMembership, Document<unknown, {}, ClassMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, ClassMembership, Document<unknown, {}, ClassMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    classId?: import("mongoose").SchemaDefinitionProperty<string, ClassMembership, Document<unknown, {}, ClassMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    joinedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, ClassMembership, Document<unknown, {}, ClassMembership, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ClassMembership & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ClassMembership>;
