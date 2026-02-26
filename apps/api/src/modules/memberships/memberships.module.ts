import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import {
    BranchMembership,
    BranchMembershipSchema,
} from './schemas/branch-membership.schema';
import {
    ClassMembership,
    ClassMembershipSchema,
} from './schemas/class-membership.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: BranchMembership.name, schema: BranchMembershipSchema },
            { name: ClassMembership.name, schema: ClassMembershipSchema },
        ]),
    ],
    controllers: [MembershipsController],
    providers: [MembershipsService],
    exports: [MembershipsService],
})
export class MembershipsModule {}
