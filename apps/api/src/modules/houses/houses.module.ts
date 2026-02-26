import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { HousesController } from './houses.controller';
import { HousesService } from './houses.service';
import { House, HouseSchema } from './house.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: House.name, schema: HouseSchema }]),
        RoleAssignmentsModule,
    ],
    controllers: [HousesController],
    providers: [HousesService],
    exports: [HousesService],
})
export class HousesModule {}
