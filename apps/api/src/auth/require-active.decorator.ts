import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ACTIVE_KEY = 'requireActive';
export const RequireActive = () => SetMetadata(REQUIRE_ACTIVE_KEY, true);
