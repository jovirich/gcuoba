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
exports.BranchMembershipSchema = exports.BranchMembership = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let BranchMembership = class BranchMembership extends mongoose_2.Document {
    userId;
    branchId;
    status;
    requestedAt;
    approvedBy;
    approvedAt;
    endedAt;
    note;
};
exports.BranchMembership = BranchMembership;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], BranchMembership.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], BranchMembership.prototype, "branchId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['requested', 'approved', 'rejected', 'ended'],
        default: 'requested',
    }),
    __metadata("design:type", String)
], BranchMembership.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], BranchMembership.prototype, "requestedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", Object)
], BranchMembership.prototype, "approvedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Object)
], BranchMembership.prototype, "approvedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Object)
], BranchMembership.prototype, "endedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", Object)
], BranchMembership.prototype, "note", void 0);
exports.BranchMembership = BranchMembership = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'user_branch_memberships' })
], BranchMembership);
exports.BranchMembershipSchema = mongoose_1.SchemaFactory.createForClass(BranchMembership);
exports.BranchMembershipSchema.index({ userId: 1, branchId: 1 }, { unique: true });
//# sourceMappingURL=branch-membership.schema.js.map