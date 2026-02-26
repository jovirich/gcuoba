import type { ClassSetDTO } from '@gcuoba/types';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RoleAssignmentsService } from '../role-assignments/role-assignments.service';
export declare class ClassesController {
    private readonly classesService;
    private readonly roleAssignmentsService;
    constructor(classesService: ClassesService, roleAssignmentsService: RoleAssignmentsService);
    findAll(): Promise<ClassSetDTO[]>;
    create(dto: CreateClassDto, user: AuthenticatedUser): Promise<ClassSetDTO>;
    update(id: string, dto: UpdateClassDto, user: AuthenticatedUser): Promise<ClassSetDTO>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        success: boolean;
    }>;
    private ensureGlobal;
}
