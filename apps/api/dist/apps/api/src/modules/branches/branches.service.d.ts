import type { BranchDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { Branch } from './schemas/branch.schema';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
export declare class BranchesService {
    private readonly branchModel;
    constructor(branchModel: Model<Branch>);
    findAll(): Promise<BranchDTO[]>;
    create(dto: CreateBranchDto): Promise<BranchDTO>;
    update(id: string, dto: UpdateBranchDto): Promise<BranchDTO>;
    remove(id: string): Promise<void>;
    exists(id: string): Promise<boolean>;
    private toDto;
}
