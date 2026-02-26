"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HousesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const house_schema_1 = require("./house.schema");
let HousesService = class HousesService {
    houseModel;
    constructor(houseModel) {
        this.houseModel = houseModel;
    }
    async findAll() {
        const docs = await this.houseModel.find().sort({ name: 1 }).exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async create(dto) {
        const created = await this.houseModel.create({
            name: dto.name,
            motto: dto.motto,
        });
        return this.toDto(created);
    }
    async update(id, dto) {
        const payload = {};
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
            throw new common_1.NotFoundException('House not found');
        }
        return this.toDto(updated);
    }
    async remove(id) {
        await this.houseModel.findByIdAndDelete(id).exec();
    }
    async exists(id) {
        if (!id) {
            return false;
        }
        const exists = await this.houseModel.exists({ _id: id });
        return Boolean(exists);
    }
    toDto(doc) {
        return {
            id: doc._id.toString(),
            name: doc.name,
            motto: doc.motto ?? null,
        };
    }
};
exports.HousesService = HousesService;
exports.HousesService = HousesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(house_schema_1.House.name)),
    __metadata("design:paramtypes", [Function])
], HousesService);
//# sourceMappingURL=houses.service.js.map