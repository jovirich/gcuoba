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
exports.FinanceReportSnapshotSchema = exports.FinanceReportSnapshot = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let FinanceReportSnapshot = class FinanceReportSnapshot extends mongoose_2.Document {
    period;
    year;
    month;
    scopeType;
    scopeId;
    totalsByCurrency;
    rowCount;
    generatedAt;
};
exports.FinanceReportSnapshot = FinanceReportSnapshot;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FinanceReportSnapshot.prototype, "period", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], FinanceReportSnapshot.prototype, "year", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], FinanceReportSnapshot.prototype, "month", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['global', 'branch', 'class'],
        required: true,
    }),
    __metadata("design:type", String)
], FinanceReportSnapshot.prototype, "scopeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], FinanceReportSnapshot.prototype, "scopeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], FinanceReportSnapshot.prototype, "totalsByCurrency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], FinanceReportSnapshot.prototype, "rowCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: () => new Date() }),
    __metadata("design:type", Date)
], FinanceReportSnapshot.prototype, "generatedAt", void 0);
exports.FinanceReportSnapshot = FinanceReportSnapshot = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: false,
        collection: 'finance_report_snapshots',
    })
], FinanceReportSnapshot);
exports.FinanceReportSnapshotSchema = mongoose_1.SchemaFactory.createForClass(FinanceReportSnapshot);
exports.FinanceReportSnapshotSchema.index({ period: 1, scopeType: 1, scopeId: 1 }, { unique: true });
exports.FinanceReportSnapshotSchema.index({ generatedAt: -1, period: -1 });
//# sourceMappingURL=finance-report-snapshot.schema.js.map