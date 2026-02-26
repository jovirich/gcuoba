import { IsBoolean } from 'class-validator';

export class UpsertRoleFeatureDto {
    @IsBoolean()
    allowed!: boolean;
}
