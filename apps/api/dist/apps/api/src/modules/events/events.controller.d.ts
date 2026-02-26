import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    list(user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string, status?: 'draft' | 'published' | 'cancelled'): Promise<import("@gcuoba/types").EventDTO[]>;
    findOne(id: string): Promise<import("@gcuoba/types").EventDTO>;
    create(dto: CreateEventDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").EventDTO>;
    update(id: string, dto: UpdateEventDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").EventDTO>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
}
