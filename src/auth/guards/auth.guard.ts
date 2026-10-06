import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/user-role';

// What the rest of the app sees as `request.user`. It is read from the
// database on every request (not from the token), so a role change, a
// deactivation or a deleted account takes effect immediately.
export type TokenPayload = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

type JwtClaims = { sub?: number; iat?: number };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const token =
      (request.cookies?.['accessToken'] as string | undefined) ??
      this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Niste autorizovani');
    }

    let claims: JwtClaims;

    try {
      claims = await this.jwtService.verifyAsync<JwtClaims>(token);
    } catch {
      throw new UnauthorizedException('Niste autorizovani');
    }

    // Outside the try: a database problem is a server error, not a reason to
    // log everyone out.
    const user = claims.sub
      ? await this.userService.getUserById(claims.sub)
      : null;

    const isRevoked =
      !!user?.tokensValidAfter &&
      (claims.iat ?? 0) < Math.floor(user.tokensValidAfter.getTime() / 1000);

    if (!user || !user.isActive || isRevoked) {
      throw new UnauthorizedException('Niste autorizovani');
    }

    request['user'] = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    } satisfies TokenPayload;

    return true;
  }

  // Safari/iOS (ITP) drops the cross-site auth cookie, so the client also
  // sends the token as an "Authorization: Bearer" header.
  private extractBearerToken(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' && token ? token : undefined;
  }
}
