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
exports.WelfareCategorySchema = exports.WelfareCategory = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let WelfareCategory = class WelfareCategory extends mongoose_2.Document {
    name;
    scope_type;
    scope_id;
    status;
};
exports.WelfareCategory = WelfareCategory;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WelfareCategory.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['global', 'branch', 'class'],
        default: 'global',
    }),
    __metadata("design:type", String)
], WelfareCategory.prototype, "scope_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], WelfareCategory.prototype, "scope_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active' }),
    __metadata("design:type", String)
], WelfareCategory.prototype, "status", void 0);
exports.WelfareCategory = WelfareCategory = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'welfare_categories' })
], WelfareCategory);
exports.WelfareCategorySchema = mongoose_1.SchemaFactory.createForClass(WelfareCategory);
//# sourceMappingURL=welfare-category.schema.js.map