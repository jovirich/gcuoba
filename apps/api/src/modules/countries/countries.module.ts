import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleAssignmentsModule } from '../role-assignments/role-assignments.module';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { Country, CountrySchema } from './schemas/country.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Country.name, schema: CountrySchema },
        ]),
        RoleAssignmentsModule,
    ],
    controllers: [CountriesController],
    providers: [CountriesService],
    exports: [CountriesService],
})
export class CountriesModule {}
