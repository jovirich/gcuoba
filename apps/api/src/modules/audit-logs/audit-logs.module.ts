import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AuditLog.name, schema: AuditLogSchema },
        ]),
        RoleAssignmentsModule,
    ],
    controllers: [AuditLogsController],
    providers: [AuditLogsService],
    exports: [AuditLogsService],
})
export class AuditLogsModule {}
