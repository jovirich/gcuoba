import type { HouseDTO } from '@gcuoba/types';
import type { Model } from 'mongoose';
import { House } from './house.schema';
import { CreateHouseDto, UpdateHouseDto } from './dto/house.dto';
export declare class HousesService {
    private readonly houseModel;
    constructor(houseModel: Model<House>);
    findAll(): Promise<HouseDTO[]>;
    create(dto: CreateHouseDto): Promise<HouseDTO>;
    update(id: string, dto: UpdateHouseDto): Promise<HouseDTO>;
    remove(id: string): Promise<void>;
    exists(id: string): Promise<boolean>;
    private toDto;
}
