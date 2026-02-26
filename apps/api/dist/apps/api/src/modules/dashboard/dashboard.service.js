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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const users_service_1 = require("../users/users.service");
const branches_service_1 = require("../branches/branches.service");
const memberships_service_1 = require("../memberships/memberships.service");
const finance_service_1 = require("../finance/finance.service");
const welfare_service_1 = require("../welfare/welfare.service");
const announcement_schema_1 = require("./schemas/announcement.schema");
const event_schema_1 = require("./schemas/event.schema");
let DashboardService = class DashboardService {
    usersService;
    branchesService;
    membershipsService;
    financeService;
    welfareService;
    announcementModel;
    eventModel;
    constructor(usersService, branchesService, membershipsService, financeService, welfareService, announcementModel, eventModel) {
        this.usersService = usersService;
        this.branchesService = branchesService;
        this.membershipsService = membershipsService;
        this.financeService = financeService;
        this.welfareService = welfareService;
        this.announcementModel = announcementModel;
        this.eventModel = eventModel;
    }
    async buildSummary(userId) {
        const [user, branches, branchMemberships, classMembership, outstandingInvoices, welfareCases, duesSummary,] = await Promise.all([
            this.usersService.findById(userId),
            this.branchesService.findAll(),
            this.membershipsService.listBranchMemberships(userId),
            this.membershipsService.getClassMembership(userId),
            this.financeService.listOutstandingInvoices(userId),
            this.welfareService.listCases(userId),
            this.financeService.buildMemberDuesSummary(userId),
        ]);
        const approvedBranchIds = branchMemberships
            .filter((membership) => membership.status === 'approved')
            .map((membership) => membership.branchId);
        const classId = classMembership?.classId ?? null;
        const [announcements, events] = await Promise.all([
            this.listAnnouncementsForUser(approvedBranchIds, classId),
            this.listEventsForUser(approvedBranchIds, classId),
        ]);
        return {
            user,
            branches,
            branchMemberships,
            classMembership,
            outstandingInvoices,
            welfareCases,
            announcements,
            events,
            duesSummary,
        };
    }
    async listAnnouncementsForUser(branchIds, classId) {
        const scopes = [{ scopeType: 'global' }];
        if (branchIds.length > 0) {
            scopes.push({ scopeType: 'branch', scopeId: { $in: branchIds } });
        }
        if (classId) {
            scopes.push({ scopeType: 'class', scopeId: classId });
        }
        const docs = await this.announcementModel
            .find({
            status: 'published',
            publishedAt: { $lte: new Date() },
            $or: scopes,
        })
            .sort({ publishedAt: -1 })
            .limit(5)
            .lean()
            .exec();
        return docs.map((doc) => ({
            id: doc._id.toString(),
            title: doc.title,
            body: doc.body,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            publishedAt: doc.publishedAt?.toISOString(),
            status: doc.status ?? 'draft',
        }));
    }
    async listEventsForUser(branchIds, classId) {
        const scopes = [{ scopeType: 'global' }];
        if (branchIds.length > 0) {
            scopes.push({ scopeType: 'branch', scopeId: { $in: branchIds } });
        }
        if (classId) {
            scopes.push({ scopeType: 'class', scopeId: classId });
        }
        const now = new Date();
        const docs = await this.eventModel
            .find({
            status: 'published',
            startAt: { $gte: now },
            $or: scopes,
        })
            .sort({ startAt: 1 })
            .limit(5)
            .lean()
            .exec();
        return docs.map((doc) => ({
            id: doc._id.toString(),
            title: doc.title,
            description: doc.description ?? null,
            scopeType: doc.scopeType,
            scopeId: doc.scopeId ?? null,
            location: doc.location ?? null,
            startAt: doc.startAt?.toISOString(),
            endAt: doc.endAt?.toISOString(),
            status: doc.status,
        }));
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, mongoose_1.InjectModel)(announcement_schema_1.Announcement.name)),
    __param(6, (0, mongoose_1.InjectModel)(event_schema_1.DashboardEvent.name)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        branches_service_1.BranchesService,
        memberships_service_1.MembershipsService,
        finance_service_1.FinanceService,
        welfare_service_1.WelfareService, Function, Function])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map