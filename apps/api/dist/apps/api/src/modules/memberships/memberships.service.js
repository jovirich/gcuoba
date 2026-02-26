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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const branch_membership_schema_1 = require("./schemas/branch-membership.schema");
const class_membership_schema_1 = require("./schemas/class-membership.schema");
let MembershipsService = class MembershipsService {
    branchModel;
    classModel;
    constructor(branchModel, classModel) {
        this.branchModel = branchModel;
        this.classModel = classModel;
    }
    async listBranchMemberships(userId) {
        const docs = await this.branchModel
            .find({ userId })
            .sort({ requestedAt: -1 })
            .lean()
            .exec();
        return docs.map((doc) => this.toBranchDto(doc));
    }
    async getClassMembership(userId) {
        const doc = await this.classModel
            .findOne({ userId })
            .lean()
            .exec();
        return doc ? this.toClassDto(doc) : null;
    }
    async requestBranchMembership(userId, payload) {
        const doc = await this.branchModel
            .findOneAndUpdate({ userId, branchId: payload.branchId }, {
            userId,
            branchId: payload.branchId,
            status: 'requested',
            requestedAt: new Date(),
            approvedAt: null,
            approvedBy: null,
            endedAt: null,
            note: payload.note ?? null,
        }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .lean()
            .exec();
        if (!doc) {
            throw new Error('Unable to create branch membership request');
        }
        return this.toBranchDto(doc);
    }
    async updateClassMembership(userId, payload) {
        const doc = await this.classModel
            .findOneAndUpdate({ userId }, { userId, classId: payload.classId, joinedAt: new Date() }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .lean()
            .exec();
        if (!doc) {
            throw new Error('Unable to update class membership');
        }
        return this.toClassDto(doc);
    }
    toBranchDto(doc) {
        return {
            id: `${doc.userId}:${doc.branchId}`,
            userId: doc.userId,
            branchId: doc.branchId,
            status: doc.status,
            requestedAt: doc.requestedAt?.toISOString(),
            approvedBy: doc.approvedBy ?? null,
            approvedAt: doc.approvedAt?.toISOString() ?? null,
            endedAt: doc.endedAt?.toISOString() ?? null,
            note: doc.note ?? null,
        };
    }
    toClassDto(doc) {
        return {
            id: doc._id?.toString() ?? doc.userId,
            userId: doc.userId,
            classId: doc.classId,
            joinedAt: doc.joinedAt?.toISOString(),
        };
    }
    async listUserIdsByClass(classId) {
        const docs = await this.classModel
            .find({ classId })
            .lean()
            .exec();
        return docs.map((doc) => doc.userId);
    }
    async listApprovedUserIdsByBranch(branchId) {
        const docs = await this.branchModel
            .find({ branchId, status: 'approved' })
            .select('userId')
            .lean()
            .exec();
        return docs.map((doc) => doc.userId);
    }
    async hasClassMembership(userId) {
        if (!userId) {
            return false;
        }
        const exists = await this.classModel.exists({ userId });
        return Boolean(exists);
    }
    async hasApprovedBranchMembership(userId) {
        if (!userId) {
            return false;
        }
        const exists = await this.branchModel.exists({
            userId,
            status: 'approved',
        });
        return Boolean(exists);
    }
    async ensureApprovedBranchMembership(userId, branchId, approvedBy = 'system') {
        const now = new Date();
        const doc = await this.branchModel
            .findOneAndUpdate({ userId, branchId }, {
            userId,
            branchId,
            status: 'approved',
            requestedAt: now,
            approvedAt: now,
            approvedBy,
            endedAt: null,
        }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .lean()
            .exec();
        if (!doc) {
            throw new Error('Unable to ensure approved branch membership');
        }
        return this.toBranchDto(doc);
    }
    async listAllBranchMemberships() {
        const docs = await this.branchModel
            .find()
            .lean()
            .exec();
        return docs.map((doc) => this.toBranchDto(doc));
    }
    async listAllClassMemberships() {
        const docs = await this.classModel
            .find()
            .lean()
            .exec();
        return docs.map((doc) => this.toClassDto(doc));
    }
};
exports.MembershipsService = MembershipsService;
exports.MembershipsService = MembershipsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(branch_membership_schema_1.BranchMembership.name)),
    __param(1, (0, mongoose_1.InjectModel)(class_membership_schema_1.ClassMembership.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], MembershipsService);
//# sourceMappingURL=memberships.service.js.map