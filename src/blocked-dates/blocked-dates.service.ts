import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isRealDate } from 'src/common/date.util';
import { SaveBlockedDateDto } from './dto/SaveBlockedDateDto';
import { BlockedDate } from './models/BlockedDate';

const TIMEZONE = 'Europe/Belgrade';

@Injectable()
export class BlockedDatesService {
  private readonly logger = new Logger(BlockedDatesService.name);

  constructor(
    @InjectRepository(BlockedDate)
    private blockedDateRepository: Repository<BlockedDate>,
  ) {}

  // What the public booking form needs: blocks that have not ended yet
  // (today, Belgrade time, still counts).
  getUpcomingBlockedDates() {
    return this.blockedDateRepository
      .createQueryBuilder('block')
      .select([
        'block.id',
        'block.startsOn',
        'block.endsOn',
        'block.city',
        'block.time',
        'block.reason',
      ])
      .where('block.endsOn >= (now() at time zone :tz)::date', {
        tz: TIMEZONE,
      })
      .orderBy('block.startsOn', 'ASC')
      .addOrderBy('block.id', 'ASC')
      .getMany();
  }

  getAllBlockedDates() {
    return this.blockedDateRepository.find({
      order: { startsOn: 'ASC', id: 'ASC' },
    });
  }

  createBlockedDate(dto: SaveBlockedDateDto) {
    return this.blockedDateRepository.save(this.toEntityValues(dto));
  }

  async updateBlockedDate(id: number, dto: SaveBlockedDateDto) {
    const blockedDate = await this.blockedDateRepository.findOne({
      where: { id },
    });

    if (!blockedDate) throw new NotFoundException('Blokada nije pronađena');

    return this.blockedDateRepository.save({
      ...blockedDate,
      ...this.toEntityValues(dto),
    });
  }

  async deleteBlockedDate(id: number) {
    await this.blockedDateRepository.delete({ id });
  }

  // Final say on a booking: throws if a block covers this day, city and
  // departure. The booking form already hides blocked options; this catches a
  // stale page or a direct API call.
  async assertNotBlocked(
    travelDate: string,
    startingLocation: string,
    travelTime: string,
  ) {
    const city = startingLocation.split(' - ')[0].trim();
    const day = travelDate.slice(0, 10);

    let block: BlockedDate | null;

    try {
      block = await this.blockedDateRepository
        .createQueryBuilder('block')
        .where(':day::date between block.startsOn and block.endsOn', { day })
        .andWhere('(block.city is null or lower(block.city) = lower(:city))', {
          city,
        })
        .andWhere('(block.time is null or block.time = :time)', {
          time: travelTime,
        })
        .orderBy('block.id', 'ASC')
        .getOne();
    } catch (error) {
      // Fail open: the customer's email is the reservation of record, so a
      // database problem (e.g. the blocked_dates table not created yet) must
      // not stop the booking from being saved.
      this.logger.error(
        'Blocked-date check failed, allowing the booking',
        error,
      );

      return;
    }

    if (block) {
      throw new BadRequestException(
        block.reason
          ? `Polazak nije moguć: ${block.reason}`
          : 'Za izabrani datum i vreme polazak nije dostupan.',
      );
    }
  }

  private toEntityValues(dto: SaveBlockedDateDto) {
    const startsOn = dto.startsOn;
    const endsOn = dto.endsOn || startsOn;

    if (!isRealDate(startsOn) || !isRealDate(endsOn)) {
      throw new BadRequestException('Datum nije ispravan');
    }

    if (endsOn < startsOn) {
      throw new BadRequestException(
        'Datum završetka ne može biti pre datuma početka',
      );
    }

    return {
      startsOn,
      endsOn,
      city: dto.city?.trim() || null,
      time: dto.time || null,
      reason: dto.reason?.trim() || null,
    };
  }
}
