import { Module } from '@nestjs/common';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';

@Module({
    imports: [
        UsersModule,
        ProfilesModule,
        MembershipsModule,
        RoleAssignmentsModule,
    ],
    controllers: [AdminMembersController],
    providers: [AdminMembersService],
})
export class AdminMembersModule {}
