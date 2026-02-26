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
exports.WelfareContributionSchema = exports.WelfareContribution = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let WelfareContribution = class WelfareContribution extends mongoose_2.Document {
    caseId;
    userId;
    contributorName;
    contributorEmail;
    amount;
    currency;
    notes;
    paidAt;
    status;
    reviewedBy;
    reviewedAt;
    reviewNote;
};
exports.WelfareContribution = WelfareContribution;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareContribution.prototype, "caseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfareContribution.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareContribution.prototype, "contributorName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfareContribution.prototype, "contributorEmail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], WelfareContribution.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NGN' }),
    __metadata("design:type", String)
], WelfareContribution.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfareContribution.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], WelfareContribution.prototype, "paidAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], WelfareContribution.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfareContribution.prototype, "reviewedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], WelfareContribution.prototype, "reviewedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfareContribution.prototype, "reviewNote", void 0);
exports.WelfareContribution = WelfareContribution = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'welfare_contributions' })
], WelfareContribution);
exports.WelfareContributionSchema = mongoose_1.SchemaFactory.createForClass(WelfareContribution);
exports.WelfareContributionSchema.index({ caseId: 1, paidAt: -1, createdAt: -1 });
exports.WelfareContributionSchema.index({ userId: 1, paidAt: -1, createdAt: -1 });
exports.WelfareContributionSchema.index({ status: 1, caseId: 1, createdAt: -1 });
//# sourceMappingURL=welfare-contribution.schema.js.map