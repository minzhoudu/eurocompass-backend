import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from 'src/user/user-role';
import { ROLES_KEY } from '../roles.decorator';
import { TokenPayload } from './auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles || roles.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayload }>();

    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Nemate dozvolu za ovu akciju');
    }

    return true;
  }
}
