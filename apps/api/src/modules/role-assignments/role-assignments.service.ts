import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { RoleAssignmentDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { RoleAssignment } from './schemas/role-assignment.schema';
import { Role } from '../roles/schemas/role.schema';
import { User } from '../users/schemas/user.schema';

const FORCED_GLOBAL_ADMIN_EMAILS = new Set(['ejovi.ekakitie@hotmail.com']);

@Injectable()
export class RoleAssignmentsService {
    constructor(
        @InjectModel(RoleAssignment.name)
        private readonly assignmentModel: Model<RoleAssignment>,
        @InjectModel(Role.name)
        private readonly roleModel: Model<Role>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
    ) {}

    async ensureGlobalAdminForUser(userId: string): Promise<void> {
        const roleCode = 'super_admin';

        let role = await this.roleModel
            .findOne({ code: roleCode, scope: 'global' })
            .exec();
        if (!role) {
            role = await this.roleModel.create({
                code: roleCode,
                name: 'Super Admin',
                scope: 'global',
            });
        }

        const existing = await this.assignmentModel
            .findOne({
                userId,
                scopeType: 'global',
                roleCode: roleCode,
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .select('_id')
            .lean<{ _id: unknown }>()
            .exec();
        if (existing) {
            return;
        }

        await this.assignmentModel.create({
            userId,
            roleId: role._id,
            roleCode: roleCode,
            scopeType: 'global',
            scopeId: null,
            startDate: new Date(),
            endDate: null,
        });
    }

    async activeAssignmentsForUser(
        userId: string,
    ): Promise<RoleAssignmentDTO[]> {
        const docs = await this.assignmentModel
            .find({
                userId,
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .lean<RoleAssignment[]>()
            .exec();

        return docs.map((doc) => this.toDto(doc));
    }

    async managedBranchIds(userId: string): Promise<string[]> {
        const docs = await this.assignmentModel
            .find({
                userId,
                scopeType: 'branch',
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .lean<RoleAssignment[]>()
            .exec();
        return docs
            .map((doc) => doc.scopeId)
            .filter((id): id is string => Boolean(id));
    }

    async managedClassIds(userId: string): Promise<string[]> {
        const docs = await this.assignmentModel
            .find({
                userId,
                scopeType: 'class',
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .lean<RoleAssignment[]>()
            .exec();
        return docs
            .map((doc) => doc.scopeId)
            .filter((id): id is string => Boolean(id));
    }

    async hasGlobalAccess(userId: string): Promise<boolean> {
        const count = await this.assignmentModel
            .countDocuments({
                userId,
                scopeType: 'global',
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .exec();
        if (count > 0) {
            return true;
        }

        const user = await this.userModel
            .findById(userId)
            .select('email')
            .lean<{ email?: string | null }>()
            .exec();
        const normalizedEmail = user?.email?.trim().toLowerCase();
        if (
            !normalizedEmail ||
            !FORCED_GLOBAL_ADMIN_EMAILS.has(normalizedEmail)
        ) {
            return false;
        }

        await this.ensureGlobalAdminForUser(userId);
        return true;
    }

    async hasAnyActiveAssignment(userId: string): Promise<boolean> {
        const count = await this.assignmentModel
            .countDocuments({
                userId,
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .exec();
        if (count > 0) {
            return true;
        }
        return this.hasGlobalAccess(userId);
    }

    async listGlobalUserIds(): Promise<string[]> {
        const docs = await this.assignmentModel
            .find({
                scopeType: 'global',
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .select('userId')
            .lean<RoleAssignment[]>()
            .exec();

        return Array.from(
            new Set(docs.map((doc) => doc.userId).filter(Boolean)),
        );
    }

    async listBranchExecutiveUserIds(branchId: string): Promise<string[]> {
        const docs = await this.assignmentModel
            .find({
                scopeType: 'branch',
                scopeId: branchId,
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .select('userId')
            .lean<RoleAssignment[]>()
            .exec();

        return Array.from(
            new Set(docs.map((doc) => doc.userId).filter(Boolean)),
        );
    }

    async listClassExecutiveUserIds(classId: string): Promise<string[]> {
        const docs = await this.assignmentModel
            .find({
                scopeType: 'class',
                scopeId: classId,
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .select('userId')
            .lean<RoleAssignment[]>()
            .exec();

        return Array.from(
            new Set(docs.map((doc) => doc.userId).filter(Boolean)),
        );
    }

    async listActiveAssignments(): Promise<RoleAssignmentDTO[]> {
        const docs = await this.assignmentModel
            .find({
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .lean<RoleAssignment[]>()
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }

    async createRoleAssignment(dto: {
        userId: string;
        roleCode: string;
        scopeType: 'global' | 'branch' | 'class';
        scopeId?: string | null;
    }): Promise<RoleAssignmentDTO> {
        const role = await this.roleModel
            .findOne({ code: dto.roleCode, scope: dto.scopeType })
            .exec();
        if (!role) {
            throw new NotFoundException(
                'Role not found for the requested scope',
            );
        }

        const scopeId =
            dto.scopeType === 'global'
                ? null
                : dto.scopeId
                  ? dto.scopeId
                  : null;
        if (dto.scopeType !== 'global' && !scopeId) {
            throw new BadRequestException(
                'scopeId is required for branch/class assignments',
            );
        }

        const existing = await this.assignmentModel
            .findOne({
                userId: dto.userId,
                roleCode: role.code,
                scopeType: dto.scopeType,
                scopeId: scopeId,
                $or: [{ endDate: null }, { endDate: { $exists: false } }],
            })
            .lean<RoleAssignment>()
            .exec();
        if (existing) {
            throw new BadRequestException('This assignment already exists');
        }

        const created = await this.assignmentModel.create({
            userId: dto.userId,
            roleId: role._id,
            roleCode: role.code,
            scopeType: dto.scopeType,
            scopeId: scopeId,
            startDate: new Date(),
            endDate: null,
        });

        return this.toDto(created);
    }

    private toDto(doc: RoleAssignment): RoleAssignmentDTO {
        return {
            id: doc._id.toString(),
            userId: doc.userId,
            roleId: doc.roleId?.toString(),
            roleCode: doc.roleCode,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            startDate: doc.startDate?.toISOString(),
            endDate: doc.endDate?.toISOString() ?? null,
        };
    }
}
