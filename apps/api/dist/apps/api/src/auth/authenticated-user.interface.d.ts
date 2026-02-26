import type { MemberStatus } from '@gcuoba/types';
export interface AuthenticatedUser {
    id: string;
    email: string;
    status: MemberStatus;
}
