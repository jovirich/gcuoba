import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WelfareController } from './welfare.controller';
import { WelfareService } from './welfare.service';
import {
    WelfareCategory,
    WelfareCategorySchema,
} from './schemas/welfare-category.schema';
import { WelfareCase, WelfareCaseSchema } from './schemas/welfare-case.schema';
import {
    WelfareContribution,
    WelfareContributionSchema,
} from './schemas/welfare-contribution.schema';
import {
    WelfarePayout,
    WelfarePayoutSchema,
} from './schemas/welfare-payout.schema';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { BranchesModule } from '../branches/branches.module';
import { ClassesModule } from '../classes/classes.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: WelfareCategory.name, schema: WelfareCategorySchema },
            { name: WelfareCase.name, schema: WelfareCaseSchema },
            {
                name: WelfareContribution.name,
                schema: WelfareContributionSchema,
            },
            { name: WelfarePayout.name, schema: WelfarePayoutSchema },
        ]),
        RoleAssignmentsModule,
        MembershipsModule,
        BranchesModule,
        ClassesModule,
        UsersModule,
        NotificationsModule,
        AuditLogsModule,
    ],
    controllers: [WelfareController],
    providers: [WelfareService],
    exports: [WelfareService],
})
export class WelfareModule {}
