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
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequireActive } from '../../auth/require-active.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@Controller('events')
@RequireActive()
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    list(
        @CurrentUser() user: AuthenticatedUser,
        @Query('scopeType') scopeType?: 'global' | 'branch' | 'class',
        @Query('scopeId') scopeId?: string,
        @Query('status') status?: 'draft' | 'published' | 'cancelled',
    ) {
        return this.eventsService.findAll(user.id, scopeType, scopeId, status);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @Post()
    async create(
        @Body() dto: CreateEventDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.eventsService.create(user.id, dto);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateEventDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.eventsService.update(user.id, id, dto);
    }

    @Delete(':id')
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.eventsService.remove(user.id, id);
    }
}
