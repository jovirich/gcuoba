import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassSet, ClassSetSchema } from './schemas/class-set.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ClassSet.name, schema: ClassSetSchema },
        ]),
        RoleAssignmentsModule,
    ],
    controllers: [ClassesController],
    providers: [ClassesService],
    exports: [ClassesService],
})
export class ClassesModule {}
