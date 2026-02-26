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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const branch_schema_1 = require("./schemas/branch.schema");
let BranchesService = class BranchesService {
    branchModel;
    constructor(branchModel) {
        this.branchModel = branchModel;
    }
    async findAll() {
        const docs = await this.branchModel.find().exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async create(dto) {
        const created = await this.branchModel.create({
            name: dto.name,
            country: dto.country,
        });
        return this.toDto(created);
    }
    async update(id, dto) {
        const updatePayload = {};
        if (dto.name !== undefined) {
            updatePayload.name = dto.name;
        }
        if (dto.country !== undefined) {
            updatePayload.country = dto.country;
        }
        const updated = await this.branchModel
            .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException('Branch not found');
        }
        return this.toDto(updated);
    }
    async remove(id) {
        await this.branchModel.findByIdAndDelete(id).exec();
    }
    async exists(id) {
        if (!id) {
            return false;
        }
        const exists = await this.branchModel.exists({ _id: id });
        return Boolean(exists);
    }
    toDto(doc) {
        return {
            id: doc._id.toString(),
            name: doc.name,
            country: doc.country,
        };
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(branch_schema_1.Branch.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BranchesService);
//# sourceMappingURL=branches.service.js.map