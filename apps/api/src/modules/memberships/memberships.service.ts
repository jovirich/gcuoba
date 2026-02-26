import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { BranchMembershipDTO, ClassMembershipDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { RequestBranchMembershipDto } from './dto/request-branch-membership.dto';
import { UpdateClassMembershipDto } from './dto/update-class-membership.dto';
import { BranchMembership } from './schemas/branch-membership.schema';
import { ClassMembership } from './schemas/class-membership.schema';

@Injectable()
export class MembershipsService {
    constructor(
        @InjectModel(BranchMembership.name)
        private readonly branchModel: Model<BranchMembership>,
        @InjectModel(ClassMembership.name)
        private readonly classModel: Model<ClassMembership>,
    ) {}

    async listBranchMemberships(
        userId: string,
    ): Promise<BranchMembershipDTO[]> {
        const docs = await this.branchModel
            .find({ userId })
            .sort({ requestedAt: -1 })
            .lean<BranchMembership[]>()
            .exec();

        return docs.map((doc) => this.toBranchDto(doc));
    }

    async getClassMembership(
        userId: string,
    ): Promise<ClassMembershipDTO | null> {
        const doc = await this.classModel
            .findOne({ userId })
            .lean<ClassMembership>()
            .exec();
        return doc ? this.toClassDto(doc) : null;
    }

    async requestBranchMembership(
        userId: string,
        payload: RequestBranchMembershipDto,
    ): Promise<BranchMembershipDTO> {
        const doc = await this.branchModel
            .findOneAndUpdate(
                { userId, branchId: payload.branchId },
                {
                    userId,
                    branchId: payload.branchId,
                    status: 'requested',
                    requestedAt: new Date(),
                    approvedAt: null,
                    approvedBy: null,
                    endedAt: null,
                    note: payload.note ?? null,
                },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            )
            .lean<BranchMembership>()
            .exec();

        if (!doc) {
            throw new Error('Unable to create branch membership request');
        }

        return this.toBranchDto(doc);
    }

    async updateClassMembership(
        userId: string,
        payload: UpdateClassMembershipDto,
    ): Promise<ClassMembershipDTO> {
        const doc = await this.classModel
            .findOneAndUpdate(
                { userId },
                { userId, classId: payload.classId, joinedAt: new Date() },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            )
            .lean<ClassMembership>()
            .exec();

        if (!doc) {
            throw new Error('Unable to update class membership');
        }

        return this.toClassDto(doc);
    }

    private toBranchDto(doc: BranchMembership): BranchMembershipDTO {
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

    private toClassDto(doc: ClassMembership): ClassMembershipDTO {
        return {
            id: doc._id?.toString() ?? doc.userId,
            userId: doc.userId,
            classId: doc.classId,
            joinedAt: doc.joinedAt?.toISOString(),
        };
    }

    async listUserIdsByClass(classId: string): Promise<string[]> {
        const docs = await this.classModel
            .find({ classId })
            .lean<ClassMembership[]>()
            .exec();
        return docs.map((doc) => doc.userId);
    }

    async listApprovedUserIdsByBranch(branchId: string): Promise<string[]> {
        const docs = await this.branchModel
            .find({ branchId, status: 'approved' })
            .select('userId')
            .lean<BranchMembership[]>()
            .exec();

        return docs.map((doc) => doc.userId);
    }

    async hasClassMembership(userId: string): Promise<boolean> {
        if (!userId) {
            return false;
        }
        const exists = await this.classModel.exists({ userId });
        return Boolean(exists);
    }

    async hasApprovedBranchMembership(userId: string): Promise<boolean> {
        if (!userId) {
            return false;
        }
        const exists = await this.branchModel.exists({
            userId,
            status: 'approved',
        });
        return Boolean(exists);
    }

    async ensureApprovedBranchMembership(
        userId: string,
        branchId: string,
        approvedBy = 'system',
    ): Promise<BranchMembershipDTO> {
        const now = new Date();
        const doc = await this.branchModel
            .findOneAndUpdate(
                { userId, branchId },
                {
                    userId,
                    branchId,
                    status: 'approved',
                    requestedAt: now,
                    approvedAt: now,
                    approvedBy,
                    endedAt: null,
                },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            )
            .lean<BranchMembership>()
            .exec();

        if (!doc) {
            throw new Error('Unable to ensure approved branch membership');
        }

        return this.toBranchDto(doc);
    }

    async listAllBranchMemberships(): Promise<BranchMembershipDTO[]> {
        const docs = await this.branchModel
            .find()
            .lean<BranchMembership[]>()
            .exec();
        return docs.map((doc) => this.toBranchDto(doc));
    }

    async listAllClassMemberships(): Promise<ClassMembershipDTO[]> {
        const docs = await this.classModel
            .find()
            .lean<ClassMembership[]>()
            .exec();
        return docs.map((doc) => this.toClassDto(doc));
    }
}
