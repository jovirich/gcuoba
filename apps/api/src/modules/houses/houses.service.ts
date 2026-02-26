import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { HouseDTO } from '@gcuoba/types';
import type { Model } from 'mongoose';
import { House } from './house.schema';
import { CreateHouseDto, UpdateHouseDto } from './dto/house.dto';

@Injectable()
export class HousesService {
    constructor(
        @InjectModel(House.name)
        private readonly houseModel: Model<House>,
    ) {}

    async findAll(): Promise<HouseDTO[]> {
        const docs = await this.houseModel.find().sort({ name: 1 }).exec();
        return docs.map((doc) => this.toDto(doc));
    }

    async create(dto: CreateHouseDto): Promise<HouseDTO> {
        const created = await this.houseModel.create({
            name: dto.name,
            motto: dto.motto,
        });

        return this.toDto(created);
    }

    async update(id: string, dto: UpdateHouseDto): Promise<HouseDTO> {
        const payload: Record<string, unknown> = {};
        if (dto.name !== undefined) {
            payload.name = dto.name;
        }
        if (dto.motto !== undefined) {
            payload.motto = dto.motto;
        }

        const updated = await this.houseModel
            .findByIdAndUpdate(id, { $set: payload }, { new: true })
            .exec();
        if (!updated) {
            throw new NotFoundException('House not found');
        }
        return this.toDto(updated);
    }

    async remove(id: string): Promise<void> {
        await this.houseModel.findByIdAndDelete(id).exec();
    }

    async exists(id: string): Promise<boolean> {
        if (!id) {
            return false;
        }

        const exists = await this.houseModel.exists({ _id: id });
        return Boolean(exists);
    }

    private toDto(doc: House): HouseDTO {
        return {
            id: doc._id.toString(),
            name: doc.name,
            motto: doc.motto ?? null,
        };
    }
}
