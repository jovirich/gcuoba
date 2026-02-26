import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Put,
} from '@nestjs/common';
import type { ProfileDTO } from '@gcuoba/types';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

@Controller('profiles')
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) {}

    @Get(':userId')
    findOne(
        @Param('userId') userId: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ProfileDTO | null> {
        this.ensureSelf(user, userId);
        return this.profilesService.findByUserId(userId);
    }

    @Put(':userId')
    upsert(
        @Param('userId') userId: string,
        @Body() payload: UpsertProfileDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<ProfileDTO> {
        this.ensureSelf(user, userId);
        return this.profilesService.upsert(userId, payload);
    }

    private ensureSelf(user: AuthenticatedUser | undefined, userId: string) {
        if (!user || user.id !== userId) {
            throw new ForbiddenException('Cannot access another profile');
        }
    }
}
