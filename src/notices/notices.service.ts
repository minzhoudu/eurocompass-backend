import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actor } from 'src/audit/audit.types';
import { AuditService } from 'src/audit/audit.service';
import { clip, diffFields } from 'src/audit/audit.util';
import { isRealDate } from 'src/common/date.util';
import { SaveNoticeDto } from './dto/SaveNoticeDto';
import { Notice } from './models/Notice';

const TIMEZONE = 'Europe/Belgrade';
const NOTICE_FIELDS = [
  'message',
  'severity',
  'startsOn',
  'endsOn',
  'isEnabled',
] as const;

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
    private auditService: AuditService,
  ) {}

  // What the public site shows right now: enabled, and today (Belgrade time)
  // falls inside the optional start/end days, both inclusive.
  getActiveNotices() {
    return this.noticeRepository
      .createQueryBuilder('notice')
      .select([
        'notice.id',
        'notice.message',
        'notice.severity',
        'notice.updatedAt',
      ])
      .where('notice.isEnabled = true')
      .andWhere(
        '(notice.startsOn is null or notice.startsOn <= (now() at time zone :tz)::date)',
        { tz: TIMEZONE },
      )
      .andWhere(
        '(notice.endsOn is null or notice.endsOn >= (now() at time zone :tz)::date)',
        { tz: TIMEZONE },
      )
      .orderBy('notice.createdAt', 'DESC')
      .getMany();
  }

  getAllNotices() {
    return this.noticeRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createNotice(dto: SaveNoticeDto, actor: Actor) {
    const notice = await this.noticeRepository.save(this.toEntityValues(dto));

    await this.auditService.record(actor, {
      action: 'notice.create',
      entityType: 'notice',
      entityId: notice.id,
      summary: `Dodato obaveštenje „${clip(notice.message)}“`,
      details: { snapshot: this.snapshot(notice) },
    });

    return notice;
  }

  async updateNotice(id: number, dto: SaveNoticeDto, actor: Actor) {
    const notice = await this.noticeRepository.findOne({ where: { id } });

    if (!notice) throw new NotFoundException('Obaveštenje nije pronađeno');

    const values = this.toEntityValues(dto);
    const changes = diffFields(notice, values, NOTICE_FIELDS);
    const updated = await this.noticeRepository.save({ ...notice, ...values });

    if (Object.keys(changes).length > 0) {
      await this.auditService.record(actor, {
        action: 'notice.update',
        entityType: 'notice',
        entityId: id,
        summary: `Izmenjeno obaveštenje „${clip(updated.message)}“`,
        details: { changes },
      });
    }

    return updated;
  }

  async deleteNotice(id: number, actor: Actor) {
    const notice = await this.noticeRepository.findOne({ where: { id } });

    await this.noticeRepository.delete({ id });

    if (notice) {
      await this.auditService.record(actor, {
        action: 'notice.delete',
        entityType: 'notice',
        entityId: id,
        summary: `Obrisano obaveštenje „${clip(notice.message)}“`,
        details: { snapshot: this.snapshot(notice) },
      });
    }
  }

  private snapshot(notice: Notice) {
    return Object.fromEntries(NOTICE_FIELDS.map((f) => [f, notice[f]]));
  }

  private toEntityValues(dto: SaveNoticeDto) {
    const startsOn = dto.startsOn || null;
    const endsOn = dto.endsOn || null;

    if (
      (startsOn && !isRealDate(startsOn)) ||
      (endsOn && !isRealDate(endsOn))
    ) {
      throw new BadRequestException('Datum nije ispravan');
    }

    if (startsOn && endsOn && endsOn < startsOn) {
      throw new BadRequestException(
        'Datum završetka ne može biti pre datuma početka',
      );
    }

    return {
      message: dto.message.trim(),
      severity: dto.severity,
      startsOn,
      endsOn,
      isEnabled: dto.isEnabled,
    };
  }
}
