import { Controller, Get } from '@nestjs/common';
import type { UserDTO } from '@gcuoba/types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    findAll(): Promise<UserDTO[]> {
        return this.usersService.findAll();
    }
}
