import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateReservationDto } from './dto/CreateReservationDto';
import { Reservation } from './models/Reservation';

type PeriodStats = {
  count: number;
  seats: number;
};

export type ReservationStats = {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  year: PeriodStats;
};

const RETENTION_YEARS = 1;
const TIMEZONE = 'Europe/Belgrade';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
  ) {}

  createReservation(dto: CreateReservationDto) {
    return this.reservationRepository.save({
      ...dto,
      note: dto.note ?? null,
    });
  }

  getReservations() {
    return this.reservationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getStats(): Promise<ReservationStats> {
    // Bucketed in Europe/Belgrade local time, not UTC, so "today" lines up
    // with the actual business day rather than rolling over at 1-2am local.
    type StatsRow = {
      period: 'today' | 'week' | 'month' | 'year';
      count: string;
      seats: string | null;
    };

    // date_trunc('week', ...) is ISO 8601 (Monday-start), which matches the
    // Serbian convention - consistent with the other buckets being
    // calendar-aligned rather than rolling windows.
    const rows = (await this.reservationRepository.query(
      `
        select 'today' as period, count(*) as count, coalesce(sum(number_of_tickets), 0) as seats
        from reservations
        where date_trunc('day', created_at at time zone $1) = date_trunc('day', now() at time zone $1)
        union all
        select 'week' as period, count(*) as count, coalesce(sum(number_of_tickets), 0) as seats
        from reservations
        where date_trunc('week', created_at at time zone $1) = date_trunc('week', now() at time zone $1)
        union all
        select 'month' as period, count(*) as count, coalesce(sum(number_of_tickets), 0) as seats
        from reservations
        where date_trunc('month', created_at at time zone $1) = date_trunc('month', now() at time zone $1)
        union all
        select 'year' as period, count(*) as count, coalesce(sum(number_of_tickets), 0) as seats
        from reservations
        where date_trunc('year', created_at at time zone $1) = date_trunc('year', now() at time zone $1)
      `,
      [TIMEZONE],
    )) as StatsRow[];

    const stats = Object.fromEntries(
      rows.map((row) => [
        row.period,
        { count: Number(row.count), seats: Number(row.seats ?? 0) },
      ]),
    ) as ReservationStats;

    return stats;
  }

  async deleteReservation(id: number) {
    await this.reservationRepository.delete({ id });
  }

  async cleanupOldReservations() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

    const result = await this.reservationRepository.delete({
      createdAt: LessThan(cutoff),
    });
    const deletedCount = result.affected ?? 0;

    this.logger.log(
      `Reservation cleanup ran: deleted ${deletedCount} reservation(s) created before ${cutoff.toISOString()}`,
    );

    return { deletedCount };
  }
}
