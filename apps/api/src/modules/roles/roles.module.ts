import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipsModule } from '../memberships/memberships.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import {
    RoleAssignment,
    RoleAssignmentSchema,
} from '../role-assignments/schemas/role-assignment.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { RoleFeature, RoleFeatureSchema } from './schemas/role-feature.schema';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Role.name, schema: RoleSchema },
            { name: RoleFeature.name, schema: RoleFeatureSchema },
            { name: RoleAssignment.name, schema: RoleAssignmentSchema },
        ]),
        RoleAssignmentsModule,
        MembershipsModule,
    ],
    controllers: [RolesController],
    providers: [RolesService],
    exports: [RolesService],
})
export class RolesModule {}
