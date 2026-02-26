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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const upload_document_dto_1 = require("./dto/upload-document.dto");
const documents_service_1 = require("./documents.service");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    listMine(user) {
        return this.documentsService.listMine(user.id);
    }
    listScope(user, scopeType, scopeId) {
        const parsedScopeType = this.parseScopeType(scopeType);
        return this.documentsService.listByScope(user.id, parsedScopeType, scopeId);
    }
    upload(user, file, dto) {
        return this.documentsService.upload(user.id, file, dto);
    }
    async download(user, documentId, response) {
        const file = await this.documentsService.download(user.id, documentId);
        response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        response.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        return new common_1.StreamableFile(file.content);
    }
    remove(user, documentId) {
        return this.documentsService.delete(user.id, documentId);
    }
    parseScopeType(scopeType) {
        if (!scopeType) {
            throw new common_1.BadRequestException('scopeType is required');
        }
        if (scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class') {
            return scopeType;
        }
        throw new common_1.BadRequestException('Invalid scopeType');
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)('scope'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('scopeType')),
    __param(2, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "listScope", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, upload_document_dto_1.UploadDocumentDto]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':documentId/download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('documentId')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "download", null);
__decorate([
    (0, common_1.Delete)(':documentId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "remove", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.Controller)('documents'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map