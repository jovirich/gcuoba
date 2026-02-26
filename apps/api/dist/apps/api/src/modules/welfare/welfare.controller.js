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
exports.WelfareController = void 0;
const common_1 = require("@nestjs/common");
const welfare_service_1 = require("./welfare.service");
const create_welfare_case_dto_1 = require("./dto/create-welfare-case.dto");
const record_contribution_dto_1 = require("./dto/record-contribution.dto");
const record_payout_dto_1 = require("./dto/record-payout.dto");
const review_welfare_entry_dto_1 = require("./dto/review-welfare-entry.dto");
const update_welfare_case_status_dto_1 = require("./dto/update-welfare-case-status.dto");
const require_active_decorator_1 = require("../../auth/require-active.decorator");
const current_user_decorator_1 = require("../../auth/current-user.decorator");
let WelfareController = class WelfareController {
    welfareService;
    constructor(welfareService) {
        this.welfareService = welfareService;
    }
    listCategories(user, scopeType, scopeId) {
        return this.welfareService.listCategories(user.id, this.parseScopeType(scopeType), scopeId);
    }
    listCases(user, scopeType, scopeId, includeClosed) {
        return this.welfareService.listCases(user.id, this.parseScopeType(scopeType), scopeId, includeClosed === 'true');
    }
    createCase(dto, user) {
        return this.welfareService.createCase(user.id, dto);
    }
    updateCaseStatus(user, caseId, dto) {
        return this.welfareService.updateCaseStatus(user.id, caseId, dto.status);
    }
    getCase(user, caseId) {
        return this.welfareService.getCase(user.id, caseId);
    }
    recordContribution(user, caseId, dto) {
        return this.welfareService.recordContribution(user.id, caseId, dto);
    }
    recordPayout(user, caseId, dto) {
        return this.welfareService.recordPayout(user.id, caseId, dto);
    }
    listQueue(user, scopeType, scopeId, status) {
        return this.welfareService.listQueue(user.id, this.parseScopeType(scopeType), scopeId, this.parseQueueStatus(status));
    }
    approveContribution(user, contributionId, dto) {
        return this.welfareService.approveContribution(user.id, contributionId, dto.note);
    }
    rejectContribution(user, contributionId, dto) {
        return this.welfareService.rejectContribution(user.id, contributionId, dto.note);
    }
    approvePayout(user, payoutId, dto) {
        return this.welfareService.approvePayout(user.id, payoutId, dto.note);
    }
    rejectPayout(user, payoutId, dto) {
        return this.welfareService.rejectPayout(user.id, payoutId, dto.note);
    }
    parseScopeType(scopeType) {
        if (!scopeType) {
            return undefined;
        }
        if (scopeType === 'global' ||
            scopeType === 'branch' ||
            scopeType === 'class') {
            return scopeType;
        }
        throw new common_1.BadRequestException('Invalid scopeType');
    }
    parseQueueStatus(status) {
        if (!status) {
            return 'pending';
        }
        if (status === 'pending' ||
            status === 'approved' ||
            status === 'rejected') {
            return status;
        }
        throw new common_1.BadRequestException('Invalid queue status');
    }
};
exports.WelfareController = WelfareController;
__decorate([
    (0, common_1.Get)('categories'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('scopeType')),
    __param(2, (0, common_1.Query)('scopeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Get)('cases'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('scopeType')),
    __param(2, (0, common_1.Query)('scopeId')),
    __param(3, (0, common_1.Query)('includeClosed')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "listCases", null);
__decorate([
    (0, common_1.Post)('cases'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_welfare_case_dto_1.CreateWelfareCaseDto, Object]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "createCase", null);
__decorate([
    (0, common_1.Patch)('cases/:caseId/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('caseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_welfare_case_status_dto_1.UpdateWelfareCaseStatusDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "updateCaseStatus", null);
__decorate([
    (0, common_1.Get)('cases/:caseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('caseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "getCase", null);
__decorate([
    (0, common_1.Post)('cases/:caseId/contributions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('caseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, record_contribution_dto_1.RecordContributionDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "recordContribution", null);
__decorate([
    (0, common_1.Post)('cases/:caseId/payouts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('caseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, record_payout_dto_1.RecordPayoutDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "recordPayout", null);
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('scopeType')),
    __param(2, (0, common_1.Query)('scopeId')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "listQueue", null);
__decorate([
    (0, common_1.Post)('contributions/:contributionId/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('contributionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_welfare_entry_dto_1.ReviewWelfareEntryDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "approveContribution", null);
__decorate([
    (0, common_1.Post)('contributions/:contributionId/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('contributionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_welfare_entry_dto_1.ReviewWelfareEntryDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "rejectContribution", null);
__decorate([
    (0, common_1.Post)('payouts/:payoutId/approve'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('payoutId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_welfare_entry_dto_1.ReviewWelfareEntryDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "approvePayout", null);
__decorate([
    (0, common_1.Post)('payouts/:payoutId/reject'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('payoutId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, review_welfare_entry_dto_1.ReviewWelfareEntryDto]),
    __metadata("design:returntype", void 0)
], WelfareController.prototype, "rejectPayout", null);
exports.WelfareController = WelfareController = __decorate([
    (0, common_1.Controller)('welfare'),
    (0, require_active_decorator_1.RequireActive)(),
    __metadata("design:paramtypes", [welfare_service_1.WelfareService])
], WelfareController);
//# sourceMappingURL=welfare.controller.js.map