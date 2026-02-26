import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ACTIVE_KEY } from './require-active.decorator';
import type { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class ActiveUserGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requireActive = this.reflector.getAllAndOverride<boolean>(
            REQUIRE_ACTIVE_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requireActive) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<{ user?: AuthenticatedUser }>();
        const user = request?.user;
        if (!user) {
            throw new ForbiddenException();
        }

        if (user.status !== 'active') {
            throw new ForbiddenException('Account pending activation');
        }

        return true;
    }
}
