import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { BranchDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { Branch } from './schemas/branch.schema';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
    constructor(
        @InjectModel(Branch.name) private readonly branchModel: Model<Branch>,
    ) {}

    async findAll(): Promise<BranchDTO[]> {
        const docs = await this.branchModel.find().exec();

        return docs.map((doc) => this.toDto(doc));
    }

    async create(dto: CreateBranchDto): Promise<BranchDTO> {
        const created = await this.branchModel.create({
            name: dto.name,
            country: dto.country,
        });

        return this.toDto(created);
    }

    async update(id: string, dto: UpdateBranchDto): Promise<BranchDTO> {
        const updatePayload: Record<string, unknown> = {};
        if (dto.name !== undefined) {
            updatePayload.name = dto.name;
        }
        if (dto.country !== undefined) {
            updatePayload.country = dto.country;
        }

        const updated = await this.branchModel
            .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
            .exec();
        if (!updated) {
            throw new NotFoundException('Branch not found');
        }
        return this.toDto(updated);
    }

    async remove(id: string): Promise<void> {
        await this.branchModel.findByIdAndDelete(id).exec();
    }

    async exists(id: string): Promise<boolean> {
        if (!id) {
            return false;
        }

        const exists = await this.branchModel.exists({ _id: id });
        return Boolean(exists);
    }

    private toDto(doc: Branch): BranchDTO {
        return {
            id: doc._id.toString(),
            name: doc.name,
            country: doc.country,
        };
    }
}
