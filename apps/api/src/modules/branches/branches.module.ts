import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { Branch, BranchSchema } from './schemas/branch.schema';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Branch.name, schema: BranchSchema },
        ]),
        RoleAssignmentsModule,
    ],
    controllers: [BranchesController],
    providers: [BranchesService],
    exports: [BranchesService],
})
export class BranchesModule {}
