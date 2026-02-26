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
import type { ClassSetDTO } from '@gcuoba/types';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { RequireActive } from '../../auth/require-active.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';

@Controller('classes')
export class ClassesController {
    constructor(
        private readonly classesService: ClassesService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get()
    findAll(): Promise<ClassSetDTO[]> {
        return this.classesService.findAll();
    }

    @Post()
    @RequireActive()
    async create(
        @Body() dto: CreateClassDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        return this.classesService.create(dto);
    }

    @Patch(':id')
    @RequireActive()
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateClassDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        return this.classesService.update(id, dto);
    }

    @Delete(':id')
    @RequireActive()
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        await this.classesService.remove(id);
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
