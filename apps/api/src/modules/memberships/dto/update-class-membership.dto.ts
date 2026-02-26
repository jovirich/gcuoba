import { IsString } from 'class-validator';

export class UpdateClassMembershipDto {
    @IsString()
    classId!: string;
}
