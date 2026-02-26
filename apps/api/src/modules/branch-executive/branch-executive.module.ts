import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchExecutiveController } from './branch-executive.controller';
import { BranchExecutiveService } from './branch-executive.service';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import {
    BranchMembership,
    BranchMembershipSchema,
} from '../memberships/schemas/branch-membership.schema';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import {
    RoleAssignment,
    RoleAssignmentSchema,
} from '../role-assignments/schemas/role-assignment.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Branch.name, schema: BranchSchema },
            { name: BranchMembership.name, schema: BranchMembershipSchema },
            { name: Role.name, schema: RoleSchema },
            { name: RoleAssignment.name, schema: RoleAssignmentSchema },
        ]),
        RoleAssignmentsModule,
        MembershipsModule,
        UsersModule,
        NotificationsModule,
        AuditLogsModule,
    ],
    controllers: [BranchExecutiveController],
    providers: [BranchExecutiveService],
})
export class BranchExecutiveModule {}
