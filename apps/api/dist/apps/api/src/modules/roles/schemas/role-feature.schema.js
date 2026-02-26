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
exports.RoleFeatureSchema = exports.RoleFeature = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let RoleFeature = class RoleFeature extends mongoose_2.Document {
    roleId;
    moduleKey;
    allowed;
};
exports.RoleFeature = RoleFeature;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Role', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], RoleFeature.prototype, "roleId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, index: true }),
    __metadata("design:type", String)
], RoleFeature.prototype, "moduleKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true }),
    __metadata("design:type", Boolean)
], RoleFeature.prototype, "allowed", void 0);
exports.RoleFeature = RoleFeature = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
        collection: 'role_features',
    })
], RoleFeature);
exports.RoleFeatureSchema = mongoose_1.SchemaFactory.createForClass(RoleFeature);
exports.RoleFeatureSchema.index({ roleId: 1, moduleKey: 1 }, { unique: true });
//# sourceMappingURL=role-feature.schema.js.map