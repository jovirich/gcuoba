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
exports.AnnouncementSchema = exports.Announcement = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Announcement = class Announcement extends mongoose_2.Document {
    title;
    body;
    scopeType;
    scopeId;
    status;
    publishedAt;
};
exports.Announcement = Announcement;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Announcement.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Announcement.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    }),
    __metadata("design:type", String)
], Announcement.prototype, "scopeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Announcement.prototype, "scopeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['draft', 'published'], default: 'draft' }),
    __metadata("design:type", String)
], Announcement.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: () => new Date() }),
    __metadata("design:type", Date)
], Announcement.prototype, "publishedAt", void 0);
exports.Announcement = Announcement = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'announcements' })
], Announcement);
exports.AnnouncementSchema = mongoose_1.SchemaFactory.createForClass(Announcement);
exports.AnnouncementSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
exports.AnnouncementSchema.index({
    scopeType: 1,
    scopeId: 1,
    status: 1,
    publishedAt: -1,
    createdAt: -1,
});
//# sourceMappingURL=announcement.schema.js.map