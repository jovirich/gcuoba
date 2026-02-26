import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { UsersModule } from '../users/users.module';
import { DuesScheme, DuesSchemeSchema } from './schemas/dues-scheme.schema';
import { DuesInvoice, DuesInvoiceSchema } from './schemas/dues-invoice.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { MembershipsModule } from '../memberships/memberships.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { BranchesModule } from '../branches/branches.module';
import { ClassesModule } from '../classes/classes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RolesModule } from '../roles/roles.module';
import {
    WelfareContribution,
    WelfareContributionSchema,
} from '../welfare/schemas/welfare-contribution.schema';
import {
    WelfarePayout,
    WelfarePayoutSchema,
} from '../welfare/schemas/welfare-payout.schema';
import {
    PaymentReceipt,
    PaymentReceiptSchema,
} from './schemas/payment-receipt.schema';
import {
    FinanceReportSnapshot,
    FinanceReportSnapshotSchema,
} from './schemas/finance-report-snapshot.schema';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Expense, ExpenseSchema } from './schemas/expense.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DuesScheme.name, schema: DuesSchemeSchema },
            { name: DuesInvoice.name, schema: DuesInvoiceSchema },
            { name: Payment.name, schema: PaymentSchema },
            {
                name: WelfareContribution.name,
                schema: WelfareContributionSchema,
            },
            { name: WelfarePayout.name, schema: WelfarePayoutSchema },
            { name: PaymentReceipt.name, schema: PaymentReceiptSchema },
            {
                name: FinanceReportSnapshot.name,
                schema: FinanceReportSnapshotSchema,
            },
            { name: Project.name, schema: ProjectSchema },
            { name: Expense.name, schema: ExpenseSchema },
        ]),
        UsersModule,
        MembershipsModule,
        RoleAssignmentsModule,
        RolesModule,
        BranchesModule,
        ClassesModule,
        NotificationsModule,
        AuditLogsModule,
    ],
    controllers: [FinanceController],
    providers: [FinanceService],
    exports: [FinanceService],
})
export class FinanceModule {}
