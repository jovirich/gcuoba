"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    userModel;
    userReadProjection = 'name email phone status';
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findAll() {
        const docs = await this.userModel
            .find()
            .select(this.userReadProjection)
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }
    async findById(id) {
        const doc = await this.userModel
            .findById(id)
            .select(this.userReadProjection)
            .exec();
        return doc ? this.toDto(doc) : null;
    }
    async updateStatus(userId, status) {
        const doc = await this.userModel
            .findByIdAndUpdate(userId, { status }, { new: true })
            .select(this.userReadProjection)
            .exec();
        if (!doc) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.toDto(doc);
    }
    async findManyByIds(ids) {
        if (ids.length === 0) {
            return [];
        }
        const docs = await this.userModel
            .find({ _id: { $in: ids } })
            .select(this.userReadProjection)
            .exec();
        return docs.map((doc) => this.toDto(doc));
    }
    async listActiveUserIds() {
        const docs = await this.userModel
            .find({ status: 'active' })
            .select('_id')
            .exec();
        return docs.map((doc) => doc._id.toString());
    }
    async create(dto) {
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
    toDto(doc) {
        return {
            id: doc._id.toString(),
            name: doc.name,
            email: doc.email,
            phone: doc.phone ?? null,
            status: doc.status,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map