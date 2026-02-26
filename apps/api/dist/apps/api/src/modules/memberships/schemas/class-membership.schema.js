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
exports.ClassMembershipSchema = exports.ClassMembership = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ClassMembership = class ClassMembership extends mongoose_2.Document {
    userId;
    classId;
    joinedAt;
    updatedAt;
};
exports.ClassMembership = ClassMembership;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], ClassMembership.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ClassMembership.prototype, "classId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], ClassMembership.prototype, "joinedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], ClassMembership.prototype, "updatedAt", void 0);
exports.ClassMembership = ClassMembership = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: { createdAt: 'joinedAt', updatedAt: 'updatedAt' },
        collection: 'user_class_membership',
    })
], ClassMembership);
exports.ClassMembershipSchema = mongoose_1.SchemaFactory.createForClass(ClassMembership);
//# sourceMappingURL=class-membership.schema.js.map