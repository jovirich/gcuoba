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
exports.WelfarePayoutSchema = exports.WelfarePayout = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let WelfarePayout = class WelfarePayout extends mongoose_2.Document {
    caseId;
    beneficiaryUserId;
    amount;
    currency;
    channel;
    reference;
    notes;
    disbursedAt;
    status;
    reviewedBy;
    reviewedAt;
    reviewNote;
};
exports.WelfarePayout = WelfarePayout;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfarePayout.prototype, "caseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfarePayout.prototype, "beneficiaryUserId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], WelfarePayout.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NGN' }),
    __metadata("design:type", String)
], WelfarePayout.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfarePayout.prototype, "channel", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfarePayout.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfarePayout.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], WelfarePayout.prototype, "disbursedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], WelfarePayout.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfarePayout.prototype, "reviewedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], WelfarePayout.prototype, "reviewedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfarePayout.prototype, "reviewNote", void 0);
exports.WelfarePayout = WelfarePayout = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'welfare_payouts' })
], WelfarePayout);
exports.WelfarePayoutSchema = mongoose_1.SchemaFactory.createForClass(WelfarePayout);
exports.WelfarePayoutSchema.index({ status: 1, caseId: 1, createdAt: -1 });
//# sourceMappingURL=welfare-payout.schema.js.map