import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMemberClassDto {
    @IsNotEmpty()
    @IsString()
    classId!: string;
}
