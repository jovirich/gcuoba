import { IsIn } from 'class-validator';

export class UpdateMemberStatusDto {
    @IsIn(['pending', 'active', 'suspended'])
    status!: 'pending' | 'active' | 'suspended';
}
