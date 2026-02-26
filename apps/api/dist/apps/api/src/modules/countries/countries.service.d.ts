import type { CountryDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
import { Country } from './schemas/country.schema';
export declare class CountriesService {
    private readonly countryModel;
    constructor(countryModel: Model<Country>);
    findAll(): Promise<CountryDTO[]>;
    create(dto: CreateCountryDto): Promise<CountryDTO>;
    update(id: string, dto: UpdateCountryDto): Promise<CountryDTO>;
    remove(id: string): Promise<void>;
    private toDto;
}
