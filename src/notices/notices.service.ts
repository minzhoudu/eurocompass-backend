import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveNoticeDto } from './dto/SaveNoticeDto';
import { Notice } from './models/Notice';

const TIMEZONE = 'Europe/Belgrade';

const isRealDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
  );
};

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
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

  createNotice(dto: SaveNoticeDto) {
    return this.noticeRepository.save(this.toEntityValues(dto));
  }

  async updateNotice(id: number, dto: SaveNoticeDto) {
    const notice = await this.noticeRepository.findOne({ where: { id } });

    if (!notice) throw new NotFoundException('Obaveštenje nije pronađeno');

    return this.noticeRepository.save({
      ...notice,
      ...this.toEntityValues(dto),
    });
  }

  async deleteNotice(id: number) {
    await this.noticeRepository.delete({ id });
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
