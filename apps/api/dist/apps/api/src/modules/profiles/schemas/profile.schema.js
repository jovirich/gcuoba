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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileSchema = exports.Profile = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Profile = class Profile extends mongoose_2.Document {
    userId;
    title;
    firstName;
    middleName;
    lastName;
    dobDay;
    dobMonth;
    dobYear;
    sex;
    stateOfOrigin;
    lgaOfOrigin;
    resHouseNo;
    resStreet;
    resArea;
    resCity;
    resCountry;
    occupation;
    photoUrl;
    houseId;
    privacyLevel;
};
exports.Profile = Profile;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Profile.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Profile.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Profile.prototype, "firstName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "middleName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Profile.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, min: 1, max: 31 }),
    __metadata("design:type", Object)
], Profile.prototype, "dobDay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, min: 1, max: 12 }),
    __metadata("design:type", Object)
], Profile.prototype, "dobMonth", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, min: 1900, max: 2100 }),
    __metadata("design:type", Object)
], Profile.prototype, "dobYear", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "sex", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "stateOfOrigin", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "lgaOfOrigin", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "resHouseNo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "resStreet", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "resArea", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "resCity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "resCountry", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "occupation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "photoUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", Object)
], Profile.prototype, "houseId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['public', 'public_to_members', 'private'],
        default: 'public_to_members',
    }),
    __metadata("design:type", String)
], Profile.prototype, "privacyLevel", void 0);
exports.Profile = Profile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'profiles' })
], Profile);
exports.ProfileSchema = mongoose_1.SchemaFactory.createForClass(Profile);
//# sourceMappingURL=profile.schema.js.map