import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CronGuard implements CanActivate {
  private readonly logger = new Logger(CronGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-cron-secret'];
    const expectedSecret = this.configService.getOrThrow<string>('CRON_SECRET');

    if (!providedSecret || providedSecret !== expectedSecret) {
      this.logger.warn(
        `Rejected cron request to ${request.originalUrl}: missing or incorrect x-cron-secret header`,
      );
      throw new UnauthorizedException('Niste autorizovani');
    }

    return true;
  }
}
