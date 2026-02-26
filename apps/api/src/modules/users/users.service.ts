import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { UserDTO } from '@gcuoba/types';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
    private readonly userReadProjection = 'name email phone status';

    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) {}

    async findAll(): Promise<UserDTO[]> {
        const docs = await this.userModel
            .find()
            .select(this.userReadProjection)
            .exec();

        return docs.map((doc) => this.toDto(doc));
    }

    async findByEmail(email: string) {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }

    async findById(id: string): Promise<UserDTO | null> {
        const doc = await this.userModel
            .findById(id)
            .select(this.userReadProjection)
            .exec();
        return doc ? this.toDto(doc) : null;
    }

    async updateStatus(
        userId: string,
        status: 'pending' | 'active' | 'suspended',
    ): Promise<UserDTO> {
        const doc = await this.userModel
            .findByIdAndUpdate(userId, { status }, { new: true })
            .select(this.userReadProjection)
            .exec();

        if (!doc) {
            throw new NotFoundException('User not found');
        }

        return this.toDto(doc);
    }

    async findManyByIds(ids: string[]): Promise<UserDTO[]> {
        if (ids.length === 0) {
            return [];
        }

        const docs = await this.userModel
            .find({ _id: { $in: ids } })
            .select(this.userReadProjection)
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }

    async listActiveUserIds(): Promise<string[]> {
        const docs = await this.userModel
            .find({ status: 'active' })
            .select('_id')
            .exec();
        return docs.map((doc) => doc._id.toString());
    }

    async create(dto: CreateUserDto): Promise<UserDTO> {
        const existing = await this.findByEmail(dto.email);
        if (existing) {
            throw new Error('Email already in use');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const created = await this.userModel.create({
            name: dto.name,
            email: dto.email.toLowerCase(),
            passwordHash,
            phone: dto.phone ?? null,
            status: 'pending',
        });

        return this.toDto(created);
    }

    private toDto(doc: User): UserDTO {
        return {
            id: doc._id.toString(),
            name: doc.name,
            email: doc.email,
            phone: doc.phone ?? null,
            status: doc.status,
        };
    }
}
