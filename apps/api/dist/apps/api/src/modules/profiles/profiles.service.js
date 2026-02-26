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
exports.ProfilesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const profile_schema_1 = require("./schemas/profile.schema");
let ProfilesService = class ProfilesService {
    profileModel;
    constructor(profileModel) {
        this.profileModel = profileModel;
    }
    async findByUserId(userId) {
        const doc = await this.profileModel
            .findOne({ userId })
            .lean()
            .exec();
        if (!doc) {
            return null;
        }
        return this.toDto(doc);
    }
    async upsert(userId, payload) {
        const doc = await this.profileModel
            .findOneAndUpdate({ userId }, { userId, ...payload }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .lean()
            .exec();
        if (!doc) {
            throw new Error('Unable to persist profile');
        }
        return this.toDto(doc);
    }
    toDto(doc) {
        return {
            id: doc._id?.toString?.() ?? doc.userId,
            userId: doc.userId,
            title: doc.title,
            firstName: doc.firstName,
            middleName: doc.middleName ?? null,
            lastName: doc.lastName,
            dobDay: doc.dobDay ?? null,
            dobMonth: doc.dobMonth ?? null,
            dobYear: doc.dobYear ?? null,
            sex: doc.sex ?? null,
            stateOfOrigin: doc.stateOfOrigin ?? null,
            lgaOfOrigin: doc.lgaOfOrigin ?? null,
            residence: {
                houseNo: doc.resHouseNo ?? null,
                street: doc.resStreet ?? null,
                area: doc.resArea ?? null,
                city: doc.resCity ?? null,
                country: doc.resCountry ?? null,
            },
            occupation: doc.occupation ?? null,
            photoUrl: doc.photoUrl ?? null,
            houseId: doc.houseId ?? null,
            privacyLevel: doc.privacyLevel ?? 'public_to_members',
        };
    }
};
exports.ProfilesService = ProfilesService;
exports.ProfilesService = ProfilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(profile_schema_1.Profile.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ProfilesService);
//# sourceMappingURL=profiles.service.js.map