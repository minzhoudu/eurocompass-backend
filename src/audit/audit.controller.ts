import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { isRealDate } from 'src/common/date.util';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/AuditLogQueryDto';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

@Controller('audit-log')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Get()
  async getEntries(@Query() params: AuditLogQueryDto) {
    const { from, to } = params;

    if ((from && !isRealDate(from)) || (to && !isRealDate(to))) {
      throw new BadRequestException('Datum nije ispravan');
    }

    if (from && to && to < from) {
      throw new BadRequestException(
        'Datum završetka ne može biti pre datuma početka',
      );
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(params.pageSize) || DEFAULT_PAGE_SIZE),
    );

    const [result, actors] = await Promise.all([
      this.auditService.getEntries(page, pageSize, {
        entityType: params.entityType || null,
        actor: params.actor?.trim() || null,
        from: from || null,
        to: to || null,
        search: params.search?.trim() || null,
      }),
      this.auditService.getActors(),
    ]);

    return { ...result, actors };
  }
}
