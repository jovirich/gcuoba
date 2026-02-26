import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsService } from './role-assignments.service';
import {
    RoleAssignment,
    RoleAssignmentSchema,
} from './schemas/role-assignment.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RoleAssignmentsController } from './role-assignments.controller';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
    imports: [
        MembershipsModule,
        MongooseModule.forFeature([
            { name: RoleAssignment.name, schema: RoleAssignmentSchema },
            { name: Role.name, schema: RoleSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [RoleAssignmentsController],
    providers: [RoleAssignmentsService],
    exports: [RoleAssignmentsService],
})
export class RoleAssignmentsModule {}
