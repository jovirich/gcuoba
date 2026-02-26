import type { UserDTO } from '@gcuoba/types';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<UserDTO[]>;
}
