import {
  BadRequestException,
  NotFoundException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentActor } from 'src/auth/actor.decorator';
import { Actor } from 'src/audit/audit.types';
import { clip, formatEntryCount } from './audit.util';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { isRealDate } from 'src/common/date.util';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/AuditLogQueryDto';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_CLEANUP_DAYS = 3650;

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

  // Owner-only clean-up of the history: `?olderThanDays=90` removes entries
  // older than that, `?all=true` removes everything. The removal itself is
  // then written as a new entry, so it can't happen unnoticed.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Delete()
  async deleteEntries(
    @CurrentActor() actor: Actor,
    @Query('olderThanDays') olderThanDaysParam?: string,
    @Query('all') allParam?: string,
  ) {
    const isAll = allParam === 'true';
    const hasAge = olderThanDaysParam !== undefined;

    if (isAll === hasAge) {
      throw new BadRequestException(
        'Izaberite ili period (olderThanDays) ili sve zapise (all=true)',
      );
    }

    const olderThanDays = hasAge ? Number(olderThanDaysParam) : null;

    if (
      olderThanDays !== null &&
      (!Number.isInteger(olderThanDays) ||
        olderThanDays < 1 ||
        olderThanDays > MAX_CLEANUP_DAYS)
    ) {
      throw new BadRequestException('Broj dana nije ispravan');
    }

    const deletedCount = await this.auditService.deleteEntries(olderThanDays);

    if (deletedCount > 0) {
      await this.auditService.record(actor, {
        action: 'audit.cleanup',
        entityType: 'audit',
        summary: `Obrisano ${formatEntryCount(deletedCount)} iz istorije izmena (${
          olderThanDays === null
            ? 'svi zapisi'
            : `starije od ${olderThanDays} dana`
        })`,
        details: { deletedCount, olderThanDays },
      });
    }

    return { deletedCount };
  }

  // Removes one entry. What was removed (its text, who did it and when) is
  // copied into a new entry, so deleting never leaves no trace.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('owner')
  @Delete(':id')
  async deleteEntry(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    const entry = await this.auditService.getEntry(id);

    if (!entry) throw new NotFoundException('Zapis nije pronađen');

    await this.auditService.deleteEntry(id);

    const entryTime = entry.createdAt.toLocaleString('sr-RS', {
      timeZone: 'Europe/Belgrade',
    });
    const entryActor = entry.actorName || entry.actorEmail || 'sistem';

    await this.auditService.record(actor, {
      action: 'audit.delete_entry',
      entityType: 'audit',
      entityId: id,
      summary: `Obrisan zapis iz istorije izmena: „${clip(entry.summary, 120)}“ (${entryTime}, ${entryActor})`,
      details: {
        snapshot: { entrySummary: entry.summary, entryActor, entryTime },
      },
    });
  }
}
