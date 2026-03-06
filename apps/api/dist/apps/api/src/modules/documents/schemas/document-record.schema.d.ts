import { Document } from 'mongoose';
export declare class DocumentRecord extends Document {
    ownerUserId: string;
    scopeType: 'private' | 'global' | 'branch' | 'class';
    scopeId?: string | null;
    originalName: string;
    storedName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    visibility: 'private' | 'scope' | 'public';
}
export declare const DocumentRecordSchema: import("mongoose").Schema<DocumentRecord, import("mongoose").Model<DocumentRecord, any, any, any, (Document<unknown, any, DocumentRecord, any, import("mongoose").DefaultSchemaOptions> & DocumentRecord & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, DocumentRecord, any, import("mongoose").DefaultSchemaOptions> & DocumentRecord & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}), any, DocumentRecord>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DocumentRecord, Document<unknown, {}, DocumentRecord, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeType?: import("mongoose").SchemaDefinitionProperty<"private" | "global" | "branch" | "class", DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    scopeId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    visibility?: import("mongoose").SchemaDefinitionProperty<"public" | "private" | "scope", DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    ownerUserId?: import("mongoose").SchemaDefinitionProperty<string, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    originalName?: import("mongoose").SchemaDefinitionProperty<string, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    storedName?: import("mongoose").SchemaDefinitionProperty<string, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    storagePath?: import("mongoose").SchemaDefinitionProperty<string, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    mimeType?: import("mongoose").SchemaDefinitionProperty<string, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    sizeBytes?: import("mongoose").SchemaDefinitionProperty<number, DocumentRecord, Document<unknown, {}, DocumentRecord, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<DocumentRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, DocumentRecord>;
