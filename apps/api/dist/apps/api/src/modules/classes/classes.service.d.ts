import type { ClassSetDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { ClassSet } from './schemas/class-set.schema';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
export declare class ClassesService {
    private readonly classModel;
    constructor(classModel: Model<ClassSet>);
    findAll(): Promise<ClassSetDTO[]>;
    create(dto: CreateClassDto): Promise<ClassSetDTO>;
    update(id: string, dto: UpdateClassDto): Promise<ClassSetDTO>;
    remove(id: string): Promise<void>;
    exists(id: string): Promise<boolean>;
    private toDto;
}
