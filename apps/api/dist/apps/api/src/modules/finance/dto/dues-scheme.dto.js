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
exports.GenerateSchemeInvoicesDto = exports.UpdateDuesSchemeDto = exports.CreateDuesSchemeDto = void 0;
const class_validator_1 = require("class-validator");
class CreateDuesSchemeDto {
    title;
    amount;
    currency;
    frequency;
    scopeType;
    scopeId;
    status;
}
exports.CreateDuesSchemeDto = CreateDuesSchemeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDuesSchemeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateDuesSchemeDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDuesSchemeDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['monthly', 'quarterly', 'annual', 'one_off']),
    __metadata("design:type", String)
], CreateDuesSchemeDto.prototype, "frequency", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['global', 'branch', 'class']),
    __metadata("design:type", String)
], CreateDuesSchemeDto.prototype, "scopeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDuesSchemeDto.prototype, "scopeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['active', 'inactive']),
    __metadata("design:type", String)
], CreateDuesSchemeDto.prototype, "status", void 0);
class UpdateDuesSchemeDto {
    title;
    amount;
    currency;
    frequency;
    scopeType;
    scopeId;
    status;
}
exports.UpdateDuesSchemeDto = UpdateDuesSchemeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDuesSchemeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateDuesSchemeDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDuesSchemeDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['monthly', 'quarterly', 'annual', 'one_off']),
    __metadata("design:type", String)
], UpdateDuesSchemeDto.prototype, "frequency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['global', 'branch', 'class']),
    __metadata("design:type", String)
], UpdateDuesSchemeDto.prototype, "scopeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], UpdateDuesSchemeDto.prototype, "scopeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['active', 'inactive']),
    __metadata("design:type", String)
], UpdateDuesSchemeDto.prototype, "status", void 0);
class GenerateSchemeInvoicesDto {
    year;
}
exports.GenerateSchemeInvoicesDto = GenerateSchemeInvoicesDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2000),
    (0, class_validator_1.Max)(2100),
    __metadata("design:type", Number)
], GenerateSchemeInvoicesDto.prototype, "year", void 0);
//# sourceMappingURL=dues-scheme.dto.js.map