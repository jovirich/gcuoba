"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentRecordSchema = exports.DocumentRecord = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DocumentRecord = class DocumentRecord extends mongoose_2.Document {
    ownerUserId;
    scopeType;
    scopeId;
    originalName;
    storedName;
    storagePath;
    mimeType;
    sizeBytes;
    visibility;
};
exports.DocumentRecord = DocumentRecord;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "ownerUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['private', 'global', 'branch', 'class'],
        required: true,
    }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "scopeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "scopeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "originalName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "storedName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "storagePath", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "mimeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], DocumentRecord.prototype, "sizeBytes", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['private', 'scope', 'public'],
        default: 'private',
    }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "visibility", void 0);
exports.DocumentRecord = DocumentRecord = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'document_records' })
], DocumentRecord);
exports.DocumentRecordSchema = mongoose_1.SchemaFactory.createForClass(DocumentRecord);
exports.DocumentRecordSchema.index({ ownerUserId: 1, createdAt: -1 });
exports.DocumentRecordSchema.index({
    scopeType: 1,
    scopeId: 1,
    visibility: 1,
    createdAt: -1,
});
//# sourceMappingURL=document-record.schema.js.map