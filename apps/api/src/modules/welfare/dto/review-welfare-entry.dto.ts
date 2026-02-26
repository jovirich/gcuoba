import { IsOptional, IsString } from 'class-validator';

export class ReviewWelfareEntryDto {
    @IsOptional()
    @IsString()
    note?: string;
}
