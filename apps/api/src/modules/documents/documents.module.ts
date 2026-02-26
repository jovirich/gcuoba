import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { ClassesModule } from '../classes/classes.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import {
    DocumentRecord,
    DocumentRecordSchema,
} from './schemas/document-record.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DocumentRecord.name, schema: DocumentRecordSchema },
        ]),
        RoleAssignmentsModule,
        MembershipsModule,
        BranchesModule,
        ClassesModule,
        AuditLogsModule,
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule {}
