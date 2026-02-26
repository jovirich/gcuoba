import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) {
            return true;
        }
        return super.canActivate(context);
    }

    handleRequest<TUser = AuthenticatedUser>(
        err: unknown,
        user: unknown,
        info: unknown,
        context: ExecutionContext,
        status?: unknown,
    ): TUser {
        void status;
        if (err || !user) {
            if (err instanceof Error) {
                throw new UnauthorizedException(err.message);
            }
            if (info instanceof Error) {
                throw new UnauthorizedException(info.message);
            }
            throw new UnauthorizedException('Authentication required');
        }
        const typedUser = user as AuthenticatedUser;
        const request = context
            .switchToHttp()
            .getRequest<{ user?: AuthenticatedUser }>();
        request.user = typedUser;
        return typedUser as TUser;
    }
}
