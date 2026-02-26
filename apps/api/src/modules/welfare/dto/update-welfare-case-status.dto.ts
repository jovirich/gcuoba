import { IsIn } from 'class-validator';

export class UpdateWelfareCaseStatusDto {
    @IsIn(['open', 'closed'])
    status!: 'open' | 'closed';
}
