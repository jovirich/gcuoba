import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsersModule } from '../users/users.module';
import { BranchesModule } from '../branches/branches.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { FinanceModule } from '../finance/finance.module';
import { WelfareModule } from '../welfare/welfare.module';
import {
    Announcement,
    AnnouncementSchema,
} from './schemas/announcement.schema';
import { DashboardEvent, EventSchema } from './schemas/event.schema';

@Module({
    imports: [
        UsersModule,
        BranchesModule,
        MembershipsModule,
        FinanceModule,
        WelfareModule,
        MongooseModule.forFeature([
            { name: Announcement.name, schema: AnnouncementSchema },
            { name: DashboardEvent.name, schema: EventSchema },
        ]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}
