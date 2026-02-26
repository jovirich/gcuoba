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
exports.DuesSchemeSchema = exports.DuesScheme = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DuesScheme = class DuesScheme extends mongoose_2.Document {
    title;
    amount;
    currency;
    frequency;
    scope_type;
    scope_id;
    status;
};
exports.DuesScheme = DuesScheme;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DuesScheme.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], DuesScheme.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'NGN' }),
    __metadata("design:type", String)
], DuesScheme.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['monthly', 'quarterly', 'annual', 'one_off'],
        default: 'annual',
    }),
    __metadata("design:type", String)
], DuesScheme.prototype, "frequency", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    }),
    __metadata("design:type", String)
], DuesScheme.prototype, "scope_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], DuesScheme.prototype, "scope_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active' }),
    __metadata("design:type", String)
], DuesScheme.prototype, "status", void 0);
exports.DuesScheme = DuesScheme = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], DuesScheme);
exports.DuesSchemeSchema = mongoose_1.SchemaFactory.createForClass(DuesScheme);
//# sourceMappingURL=dues-scheme.schema.js.map