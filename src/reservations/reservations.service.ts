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

export type PaginatedReservations = {
  items: (Reservation & { isDuplicateTrip: boolean })[];
  total: number;
  page: number;
  pageSize: number;
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

  async getReservations(
    page: number,
    pageSize: number,
    search: string | null,
  ): Promise<PaginatedReservations> {
    // The duplicate-trip flag is computed over the ENTIRE table (not just the
    // current page/search results), so it stays correct even when a matching
    // pair of bookings lands on two different pages.
    type ReservationRow = {
      id: number;
      full_name: string;
      email: string;
      phone: string;
      starting_location: string;
      travel_date: string;
      travel_time: string;
      number_of_tickets: number;
      note: string | null;
      created_at: Date;
      is_duplicate_trip: boolean;
      total_count: string;
    };

    const offset = (page - 1) * pageSize;

    const rows = (await this.reservationRepository.query(
      `
        with trip_groups as (
          select
            lower(trim(email)) as norm_email,
            travel_date,
            travel_time,
            lower(trim(starting_location)) as norm_location,
            count(*) as trip_count
          from reservations
          group by 1, 2, 3, 4
        ),
        enriched as (
          select
            r.id,
            r.full_name,
            r.email,
            r.phone,
            r.starting_location,
            -- Cast explicitly: the pg driver parses a bare "date" column into
            -- a JS Date at local midnight, which toISOString() then shifts
            -- across a day boundary (Europe/Belgrade is ahead of UTC).
            -- TypeORM's find() avoided this via its own date<->string
            -- transformer, which raw query() bypasses entirely.
            r.travel_date::text as travel_date,
            r.travel_time,
            r.number_of_tickets,
            r.note,
            r.created_at,
            (tg.trip_count > 1) as is_duplicate_trip
          from reservations r
          join trip_groups tg
            on tg.norm_email = lower(trim(r.email))
            and tg.travel_date = r.travel_date
            and tg.travel_time = r.travel_time
            and tg.norm_location = lower(trim(r.starting_location))
        )
        select *, count(*) over () as total_count
        from enriched
        where ($1::text is null or full_name ilike '%' || $1 || '%' or email ilike '%' || $1 || '%')
        order by created_at desc
        limit $2 offset $3
      `,
      [search, pageSize, offset],
    )) as ReservationRow[];

    const items = rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      startingLocation: row.starting_location,
      travelDate: row.travel_date,
      travelTime: row.travel_time,
      numberOfTickets: row.number_of_tickets,
      note: row.note,
      createdAt: row.created_at,
      isDuplicateTrip: row.is_duplicate_trip,
    })) as (Reservation & { isDuplicateTrip: boolean })[];

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

    return { items, total, page, pageSize };
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
