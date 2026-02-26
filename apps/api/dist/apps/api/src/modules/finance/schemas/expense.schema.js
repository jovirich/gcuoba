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
exports.ExpenseSchema = exports.Expense = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Expense = class Expense extends mongoose_2.Document {
    scope_type;
    scope_id;
    project_id;
    title;
    description;
    notes;
    amount;
    currency;
    status;
    approval_stage;
    submitted_by;
    approved_by;
    approved_at;
    first_approved_by;
    first_approved_at;
    second_approved_by;
    second_approved_at;
    rejected_by;
    rejected_at;
};
exports.Expense = Expense;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    }),
    __metadata("design:type", String)
], Expense.prototype, "scope_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "scope_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Project', default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "project_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Expense.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Expense.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NGN' }),
    __metadata("design:type", String)
], Expense.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Expense.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['pending', 'finance_approved', 'approved', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Expense.prototype, "approval_stage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "submitted_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "first_approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "first_approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "second_approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "second_approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "rejected_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, default: null }),
    __metadata("design:type", Object)
], Expense.prototype, "rejected_at", void 0);
exports.Expense = Expense = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Expense);
exports.ExpenseSchema = mongoose_1.SchemaFactory.createForClass(Expense);
exports.ExpenseSchema.index({ scope_type: 1, scope_id: 1, createdAt: -1 });
exports.ExpenseSchema.index({ approval_stage: 1, createdAt: -1 });
exports.ExpenseSchema.index({ project_id: 1, createdAt: -1 });
//# sourceMappingURL=expense.schema.js.map