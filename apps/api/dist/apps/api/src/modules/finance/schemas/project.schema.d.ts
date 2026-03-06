import { Document } from 'mongoose';
export declare class Project extends Document {
    name: string;
    scope_type: 'global' | 'branch' | 'class';
    scope_id?: string | null;
    budget?: number | null;
    actual_spend: number;
    start_date?: Date;
    end_date?: Date;
    status: 'planning' | 'active' | 'completed';
    owner_id?: string | null;
}
export type ProjectDocument = Project & Document;
export declare const ProjectSchema: import("mongoose").Schema<Project, import("mongoose").Model<Project, any, any, any, (Document<unknown, any, Project, any, import("mongoose").DefaultSchemaOptions> & Project & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Project, any, import("mongoose").DefaultSchemaOptions> & Project & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, Project>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Project, Document<unknown, {}, Project, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    name?: import("mongoose").SchemaDefinitionProperty<string, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<"active" | "completed" | "planning", Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    budget?: import("mongoose").SchemaDefinitionProperty<number | null | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_type?: import("mongoose").SchemaDefinitionProperty<"global" | "branch" | "class", Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scope_id?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    actual_spend?: import("mongoose").SchemaDefinitionProperty<number, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    start_date?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    end_date?: import("mongoose").SchemaDefinitionProperty<Date | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    owner_id?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Project, Document<unknown, {}, Project, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Project & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Project>;
