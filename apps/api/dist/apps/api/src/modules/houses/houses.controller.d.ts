import { HousesService } from './houses.service';
import { CreateHouseDto, UpdateHouseDto } from './dto/house.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
export declare class HousesController {
    private readonly housesService;
    private readonly roleAssignmentsService;
    constructor(housesService: HousesService, roleAssignmentsService: RoleAssignmentsService);
    findAll(): Promise<import("@gcuoba/types").HouseDTO[]>;
    create(dto: CreateHouseDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").HouseDTO>;
    update(id: string, dto: UpdateHouseDto, user: AuthenticatedUser): Promise<import("@gcuoba/types").HouseDTO>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    private ensureGlobal;
}
