import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import type { CountryDTO } from '@gcuoba/types';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';

@Controller('countries')
export class CountriesController {
    constructor(
        private readonly countriesService: CountriesService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get()
    findAll(): Promise<CountryDTO[]> {
        return this.countriesService.findAll();
    }

    @Post()
    @RequireActive()
    async create(
        @Body() dto: CreateCountryDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<CountryDTO> {
        await this.ensureGlobal(user);
        return this.countriesService.create(dto);
    }

    @Patch(':id')
    @RequireActive()
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateCountryDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<CountryDTO> {
        await this.ensureGlobal(user);
        return this.countriesService.update(id, dto);
    }

    @Delete(':id')
    @RequireActive()
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        await this.countriesService.remove(id);
        return { success: true };
    }

    private async ensureGlobal(user?: AuthenticatedUser) {
        if (!user) {
            throw new ForbiddenException('Not authorized');
        }
        const hasAccess = await this.roleAssignmentsService.hasGlobalAccess(
            user.id,
        );
        if (!hasAccess) {
            throw new ForbiddenException('Not authorized');
        }
    }
}
