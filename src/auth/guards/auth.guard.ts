import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type TokenPayload = {
  email: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const requset = context.switchToHttp().getRequest<Request>();
    const cookieToken = requset.cookies['accessToken'] as string;

    if (!cookieToken) {
      throw new UnauthorizedException('Niste autorizovani');
    }

    try {
      const tokenPayload =
        await this.jwtService.verifyAsync<TokenPayload>(cookieToken);

      requset['user'] = {
        email: tokenPayload.email,
        firstName: tokenPayload.firstName,
        lastName: tokenPayload.lastName,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Niste autorizovani');
    }
  }
}
