"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const finance_controller_1 = require("./finance.controller");
const finance_service_1 = require("./finance.service");
const users_module_1 = require("../users/users.module");
const dues_scheme_schema_1 = require("./schemas/dues-scheme.schema");
const dues_invoice_schema_1 = require("./schemas/dues-invoice.schema");
const payment_schema_1 = require("./schemas/payment.schema");
const memberships_module_1 = require("../memberships/memberships.module");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const branches_module_1 = require("../branches/branches.module");
const classes_module_1 = require("../classes/classes.module");
const notifications_module_1 = require("../notifications/notifications.module");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
const roles_module_1 = require("../roles/roles.module");
const welfare_contribution_schema_1 = require("../welfare/schemas/welfare-contribution.schema");
const welfare_payout_schema_1 = require("../welfare/schemas/welfare-payout.schema");
const payment_receipt_schema_1 = require("./schemas/payment-receipt.schema");
const finance_report_snapshot_schema_1 = require("./schemas/finance-report-snapshot.schema");
const project_schema_1 = require("./schemas/project.schema");
const expense_schema_1 = require("./schemas/expense.schema");
let FinanceModule = class FinanceModule {
};
exports.FinanceModule = FinanceModule;
exports.FinanceModule = FinanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: dues_scheme_schema_1.DuesScheme.name, schema: dues_scheme_schema_1.DuesSchemeSchema },
                { name: dues_invoice_schema_1.DuesInvoice.name, schema: dues_invoice_schema_1.DuesInvoiceSchema },
                { name: payment_schema_1.Payment.name, schema: payment_schema_1.PaymentSchema },
                {
                    name: welfare_contribution_schema_1.WelfareContribution.name,
                    schema: welfare_contribution_schema_1.WelfareContributionSchema,
                },
                { name: welfare_payout_schema_1.WelfarePayout.name, schema: welfare_payout_schema_1.WelfarePayoutSchema },
                { name: payment_receipt_schema_1.PaymentReceipt.name, schema: payment_receipt_schema_1.PaymentReceiptSchema },
                {
                    name: finance_report_snapshot_schema_1.FinanceReportSnapshot.name,
                    schema: finance_report_snapshot_schema_1.FinanceReportSnapshotSchema,
                },
                { name: project_schema_1.Project.name, schema: project_schema_1.ProjectSchema },
                { name: expense_schema_1.Expense.name, schema: expense_schema_1.ExpenseSchema },
            ]),
            users_module_1.UsersModule,
            memberships_module_1.MembershipsModule,
            role_assignments_module_1.RoleAssignmentsModule,
            roles_module_1.RolesModule,
            branches_module_1.BranchesModule,
            classes_module_1.ClassesModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [finance_controller_1.FinanceController],
        providers: [finance_service_1.FinanceService],
        exports: [finance_service_1.FinanceService],
    })
], FinanceModule);
//# sourceMappingURL=finance.module.js.map