import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CountryDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
import { Country } from './schemas/country.schema';

@Injectable()
export class CountriesService {
    constructor(
        @InjectModel(Country.name)
        private readonly countryModel: Model<Country>,
    ) {}

    async findAll(): Promise<CountryDTO[]> {
        const docs = await this.countryModel.find().sort({ name: 1 }).exec();
        return docs.map((doc) => this.toDto(doc));
    }

    async create(dto: CreateCountryDto): Promise<CountryDTO> {
        const created = await this.countryModel.create({
            name: dto.name.trim(),
            isoCode: dto.isoCode?.trim().toUpperCase() ?? null,
        });
        return this.toDto(created);
    }

    async update(id: string, dto: UpdateCountryDto): Promise<CountryDTO> {
        const payload: Record<string, unknown> = {};
        if (dto.name !== undefined) {
            payload.name = dto.name.trim();
        }
        if (dto.isoCode !== undefined) {
            const value = dto.isoCode === null ? '' : String(dto.isoCode);
            payload.isoCode = value.trim() ? value.trim().toUpperCase() : null;
        }

        const updated = await this.countryModel
            .findByIdAndUpdate(id, { $set: payload }, { new: true })
            .exec();
        if (!updated) {
            throw new NotFoundException('Country not found');
        }
        return this.toDto(updated);
    }

    async remove(id: string): Promise<void> {
        await this.countryModel.findByIdAndDelete(id).exec();
    }

    private toDto(doc: Country): CountryDTO {
        return {
            id: doc._id.toString(),
            name: doc.name,
            isoCode: doc.isoCode ?? null,
        };
    }
}
