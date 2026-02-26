import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClassSetDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { ClassSet } from './schemas/class-set.schema';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
    constructor(
        @InjectModel(ClassSet.name)
        private readonly classModel: Model<ClassSet>,
    ) {}

    async findAll(): Promise<ClassSetDTO[]> {
        const docs = await this.classModel
            .find()
            .sort({ entryYear: -1 })
            .exec();

        return docs.map((doc) => this.toDto(doc));
    }

    async create(dto: CreateClassDto): Promise<ClassSetDTO> {
        const created = await this.classModel.create({
            label: dto.label,
            entryYear: dto.entryYear,
            status: dto.status,
        });

        return this.toDto(created);
    }

    async update(id: string, dto: UpdateClassDto): Promise<ClassSetDTO> {
        const updatePayload: Record<string, unknown> = {};
        if (dto.label !== undefined) {
            updatePayload.label = dto.label;
        }
        if (dto.entryYear !== undefined) {
            updatePayload.entryYear = dto.entryYear;
        }
        if (dto.status !== undefined) {
            updatePayload.status = dto.status;
        }

        const updated = await this.classModel
            .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
            .exec();
        if (!updated) {
            throw new NotFoundException('Class not found');
        }
        return this.toDto(updated);
    }

    async remove(id: string): Promise<void> {
        await this.classModel.findByIdAndDelete(id).exec();
    }

    async exists(id: string): Promise<boolean> {
        if (!id) {
            return false;
        }

        const exists = await this.classModel.exists({ _id: id });
        return Boolean(exists);
    }

    private toDto(doc: ClassSet): ClassSetDTO {
        return {
            id: doc._id.toString(),
            label: doc.label,
            entryYear: doc.entryYear,
            status: doc.status,
        };
    }
}
