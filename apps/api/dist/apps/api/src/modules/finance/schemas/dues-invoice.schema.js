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
exports.DuesInvoiceSchema = exports.DuesInvoice = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DuesInvoice = class DuesInvoice extends mongoose_2.Document {
    schemeId;
    userId;
    amount;
    currency;
    periodStart;
    periodEnd;
    status;
    paidAmount;
};
exports.DuesInvoice = DuesInvoice;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'DuesScheme', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DuesInvoice.prototype, "schemeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], DuesInvoice.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], DuesInvoice.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NGN' }),
    __metadata("design:type", String)
], DuesInvoice.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], DuesInvoice.prototype, "periodStart", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], DuesInvoice.prototype, "periodEnd", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['unpaid', 'part_paid', 'paid'],
        default: 'unpaid',
    }),
    __metadata("design:type", String)
], DuesInvoice.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], DuesInvoice.prototype, "paidAmount", void 0);
exports.DuesInvoice = DuesInvoice = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], DuesInvoice);
exports.DuesInvoiceSchema = mongoose_1.SchemaFactory.createForClass(DuesInvoice);
exports.DuesInvoiceSchema.index({
    userId: 1,
    status: 1,
    periodStart: -1,
    createdAt: -1,
});
exports.DuesInvoiceSchema.index({ createdAt: -1 });
exports.DuesInvoiceSchema.index({ schemeId: 1, userId: 1, periodStart: 1 });
//# sourceMappingURL=dues-invoice.schema.js.map