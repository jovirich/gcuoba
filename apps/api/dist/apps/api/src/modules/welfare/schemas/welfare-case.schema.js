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
exports.WelfareCaseSchema = exports.WelfareCase = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let WelfareCase = class WelfareCase extends mongoose_2.Document {
    title;
    description;
    categoryId;
    scopeType;
    scopeId;
    targetAmount;
    currency;
    status;
    totalRaised;
    totalDisbursed;
    beneficiaryName;
    beneficiaryUserId;
};
exports.WelfareCase = WelfareCase;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareCase.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareCase.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareCase.prototype, "categoryId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareCase.prototype, "scopeType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfareCase.prototype, "scopeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], WelfareCase.prototype, "targetAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NGN' }),
    __metadata("design:type", String)
], WelfareCase.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'open' }),
    __metadata("design:type", String)
], WelfareCase.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], WelfareCase.prototype, "totalRaised", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], WelfareCase.prototype, "totalDisbursed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfareCase.prototype, "beneficiaryName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], WelfareCase.prototype, "beneficiaryUserId", void 0);
exports.WelfareCase = WelfareCase = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'welfare_cases' })
], WelfareCase);
exports.WelfareCaseSchema = mongoose_1.SchemaFactory.createForClass(WelfareCase);
exports.WelfareCaseSchema.index({ status: 1, scopeType: 1, scopeId: 1, createdAt: -1 });
//# sourceMappingURL=welfare-case.schema.js.map