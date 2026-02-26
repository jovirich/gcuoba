import type { CountryDTO } from '@gcuoba/types';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
export declare class CountriesController {
    private readonly countriesService;
    private readonly roleAssignmentsService;
    constructor(countriesService: CountriesService, roleAssignmentsService: RoleAssignmentsService);
    findAll(): Promise<CountryDTO[]>;
    create(dto: CreateCountryDto, user: AuthenticatedUser): Promise<CountryDTO>;
    update(id: string, dto: UpdateCountryDto, user: AuthenticatedUser): Promise<CountryDTO>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    private ensureGlobal;
}
