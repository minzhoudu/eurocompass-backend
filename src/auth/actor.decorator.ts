import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Actor } from 'src/audit/audit.types';
import { TokenPayload } from './guards/auth.guard';

// Best effort: behind a proxy this is the address the proxy reports, which a
// client can influence, so the admin shows it as informational only.
export const getClientIp = (request: Request) => {
  const forwarded = request.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();

  return first || request.ip || null;
};

// The signed-in admin making this request (use after AuthGuard).
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayload }>();
    const user = request.user;

    return {
      email: user?.email ?? null,
      name: user ? `${user.firstName} ${user.lastName}`.trim() : null,
      ip: getClientIp(request),
    };
  },
);
