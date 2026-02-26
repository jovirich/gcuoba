import {
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateRoleAssignmentDto {
    @IsMongoId()
    userId!: string;

    @IsString()
    @IsNotEmpty()
    roleCode!: string;

    @IsEnum(['global', 'branch', 'class'])
    scopeType!: 'global' | 'branch' | 'class';

    @IsOptional()
    @IsString()
    scopeId?: string | null;
}
