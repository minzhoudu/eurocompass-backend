import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CronGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-cron-secret'];
    const expectedSecret = this.configService.getOrThrow<string>('CRON_SECRET');

    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Niste autorizovani');
    }

    return true;
  }
}
