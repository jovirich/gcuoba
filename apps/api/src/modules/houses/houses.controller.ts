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
import { HousesService } from './houses.service';
import { CreateHouseDto, UpdateHouseDto } from './dto/house.dto';
import { RequireActive } from '../../auth/require-active.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';

@Controller('houses')
export class HousesController {
    constructor(
        private readonly housesService: HousesService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get()
    findAll() {
        return this.housesService.findAll();
    }

    @Post()
    @RequireActive()
    async create(
        @Body() dto: CreateHouseDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        return this.housesService.create(dto);
    }

    @Patch(':id')
    @RequireActive()
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateHouseDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        return this.housesService.update(id, dto);
    }

    @Delete(':id')
    @RequireActive()
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        await this.housesService.remove(id);
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
