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
import type { BranchDTO } from '@gcuoba/types';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { RequireActive } from '../../auth/require-active.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';

@Controller('branches')
export class BranchesController {
    constructor(
        private readonly branchesService: BranchesService,
        private readonly roleAssignmentsService: RoleAssignmentsService,
    ) {}

    @Get()
    findAll(): Promise<BranchDTO[]> {
        return this.branchesService.findAll();
    }

    @Post()
    @RequireActive()
    async create(
        @Body() dto: CreateBranchDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchDTO> {
        await this.ensureGlobal(user);
        return this.branchesService.create(dto);
    }

    @Patch(':id')
    @RequireActive()
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateBranchDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BranchDTO> {
        await this.ensureGlobal(user);
        return this.branchesService.update(id, dto);
    }

    @Delete(':id')
    @RequireActive()
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.ensureGlobal(user);
        await this.branchesService.remove(id);
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
