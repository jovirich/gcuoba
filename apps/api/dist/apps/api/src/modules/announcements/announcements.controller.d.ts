import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementsService } from './announcements.service';
export declare class AnnouncementsController {
    private readonly announcementsService;
    constructor(announcementsService: AnnouncementsService);
    findAll(user: AuthenticatedUser, scopeType?: 'global' | 'branch' | 'class', scopeId?: string, status?: 'draft' | 'published'): Promise<import("@gcuoba/types").AnnouncementDTO[]>;
    findOne(id: string): Promise<import("@gcuoba/types").AnnouncementDTO>;
    create(dto: CreateAnnouncementDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").AnnouncementDTO>;
    update(id: string, dto: UpdateAnnouncementDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").AnnouncementDTO>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
}
