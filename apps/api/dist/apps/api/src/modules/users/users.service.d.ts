import type { UserDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
export declare class UsersService {
    private readonly userModel;
    private readonly userReadProjection;
    constructor(userModel: Model<User>);
    findAll(): Promise<UserDTO[]>;
    findByEmail(email: string): Promise<(import("mongoose").Document<unknown, {}, User, {}, import("mongoose").DefaultSchemaOptions> & User & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
    findById(id: string): Promise<UserDTO | null>;
    updateStatus(userId: string, status: 'pending' | 'active' | 'suspended'): Promise<UserDTO>;
    findManyByIds(ids: string[]): Promise<UserDTO[]>;
    listActiveUserIds(): Promise<string[]>;
    create(dto: CreateUserDto): Promise<UserDTO>;
    private toDto;
}
