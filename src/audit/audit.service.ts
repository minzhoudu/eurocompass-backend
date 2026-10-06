import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Actor, AuditEntry } from './audit.types';
import { AuditLog } from './models/AuditLog';

const TIMEZONE = 'Europe/Belgrade';
const RETENTION_YEARS = 1;

export type AuditLogFilters = {
  entityType: string | null;
  actor: string | null;
  from: string | null;
  to: string | null;
  search: string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  // Never throws: the admin's action has already happened, and a problem with
  // the log (e.g. the audit_log table not created yet) must not undo or hide
  // it. Failures are logged on the server instead.
  async record(actor: Actor, entry: AuditEntry) {
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          actorEmail: actor.email,
          actorName: actor.name,
          ipAddress: actor.ip,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId == null ? null : String(entry.entityId),
          summary: entry.summary,
          details: entry.details ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(`Could not write audit entry "${entry.action}"`, error);
    }
  }

  async getEntries(page: number, pageSize: number, filters: AuditLogFilters) {
    const query = this.auditRepository.createQueryBuilder('entry');

    if (filters.entityType) {
      query.andWhere('entry.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters.actor) {
      query.andWhere('entry.actorEmail = :actor', { actor: filters.actor });
    }

    // Whole Belgrade calendar days, both ends inclusive.
    if (filters.from) {
      query.andWhere(
        `(entry.createdAt at time zone :tz)::date >= :from::date`,
        { tz: TIMEZONE, from: filters.from },
      );
    }

    if (filters.to) {
      query.andWhere(`(entry.createdAt at time zone :tz)::date <= :to::date`, {
        tz: TIMEZONE,
        to: filters.to,
      });
    }

    if (filters.search) {
      query.andWhere('entry.summary ilike :search', {
        search: `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    }

    const [items, total] = await query
      .orderBy('entry.createdAt', 'DESC')
      .addOrderBy('entry.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize };
  }

  // For the actor filter in the admin list.
  async getActors() {
    const rows = await this.auditRepository
      .createQueryBuilder('entry')
      .select('entry.actorEmail', 'email')
      .addSelect('max(entry.actorName)', 'name')
      .where('entry.actorEmail is not null')
      .groupBy('entry.actorEmail')
      .orderBy('entry.actorEmail', 'ASC')
      .getRawMany<{ email: string; name: string | null }>();

    return rows;
  }

  getEntry(id: number) {
    return this.auditRepository.findOne({ where: { id } });
  }

  async deleteEntry(id: number) {
    await this.auditRepository.delete({ id });
  }

  // Owner-initiated clean-up. `olderThanDays: null` removes everything.
  async deleteEntries(olderThanDays: number | null) {
    const query = this.auditRepository.createQueryBuilder().delete();

    if (olderThanDays !== null) {
      const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);

      query.where('created_at < :cutoff', { cutoff });
    }

    const result = await query.execute();

    return result.affected ?? 0;
  }

  // Entries are only kept for a year, like the reservations they describe.
  async deleteExpired() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

    try {
      const result = await this.auditRepository.delete({
        createdAt: LessThan(cutoff),
      });

      return result.affected ?? 0;
    } catch (error) {
      this.logger.error('Could not prune the audit log', error);

      return 0;
    }
  }
}
