import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequireActive } from '../../auth/require-active.decorator';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@RequireActive()
export class AnnouncementsController {
    constructor(private readonly announcementsService: AnnouncementsService) {}

    @Get()
    findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
        @Query('status') status?: 'draft' | 'published',
    ) {
        return this.announcementsService.findAll(
            user.id,
            scopeType,
            scopeId,
            status,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.announcementsService.findOne(id);
    }

    @Post()
    async create(
        @Body() dto: CreateAnnouncementDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.announcementsService.create(user.id, dto);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateAnnouncementDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.announcementsService.update(user.id, id, dto);
    }

    @Delete(':id')
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.announcementsService.remove(user.id, id);
    }
}
