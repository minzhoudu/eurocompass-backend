import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { BlockedDatesService } from 'src/blocked-dates/blocked-dates.service';
import { CreateReservationDto } from './dto/CreateReservationDto';
import { ReservationSort } from './dto/ReservationFiltersDto';
import { Reservation } from './models/Reservation';
import { buildReservationsCsv } from './reservations-csv.util';

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

export type ReservationFilters = {
  travelFrom: string | null;
  travelTo: string | null;
  location: string | null;
  time: string | null;
  duplicatesOnly: boolean;
  sort: ReservationSort;
};

// Chosen from a fixed whitelist (never user text), so it is safe to splice into
// the query. `id` keeps paging stable when the sort key ties.
const ORDER_BY: Record<ReservationSort, string> = {
  newest: 'created_at desc, id desc',
  // Same departure (date + time) is grouped by station, then by booking order.
  travel_asc: 'travel_date asc, travel_time asc, starting_location asc, id asc',
  travel_desc:
    'travel_date desc, travel_time desc, starting_location asc, id desc',
};

export type ReservationAnalytics = {
  range: { from: string; to: string };
  // The period of the same length that ends the day before `range` starts.
  previousRange: { from: string; to: string };
  totals: { bookings: number; seats: number };
  previousTotals: { bookings: number; seats: number };
  byDay: { date: string; city: string; bookings: number; seats: number }[];
  byDeparture: {
    city: string;
    time: string;
    bookings: number;
    seats: number;
  }[];
  byStation: { location: string; bookings: number; seats: number }[];
  // 1 = Monday ... 7 = Sunday (ISO).
  byWeekday: { weekday: number; bookings: number; seats: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const dayToMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const msToDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Reservations are kept for a year, so this is far above a real export.
const MAX_EXPORT_ROWS = 20000;

const RETENTION_YEARS = 1;
const TIMEZONE = 'Europe/Belgrade';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private blockedDatesService: BlockedDatesService,
  ) {}

  async createReservation(dto: CreateReservationDto) {
    await this.blockedDatesService.assertNotBlocked(
      dto.travelDate,
      dto.startingLocation,
      dto.travelTime,
    );

    return this.reservationRepository.save({
      ...dto,
      note: dto.note ?? null,
    });
  }

  async getReservations(
    page: number,
    pageSize: number,
    search: string | null,
    filters: ReservationFilters,
  ): Promise<PaginatedReservations> {
    const { items, total } = await this.findReservations(
      search,
      filters,
      pageSize,
      (page - 1) * pageSize,
    );

    return { items, total, page, pageSize };
  }

  // Every reservation matching the search and filters (not just one page), as
  // a CSV the admin can open in a spreadsheet.
  async exportReservationsCsv(
    search: string | null,
    filters: ReservationFilters,
  ) {
    const { items } = await this.findReservations(
      search,
      filters,
      MAX_EXPORT_ROWS,
      0,
    );

    return buildReservationsCsv(items);
  }

  private async findReservations(
    search: string | null,
    filters: ReservationFilters,
    limit: number,
    offset: number,
  ): Promise<{
    items: (Reservation & { isDuplicateTrip: boolean })[];
    total: number;
  }> {
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
          and ($4::date is null or travel_date::date >= $4::date)
          and ($5::date is null or travel_date::date <= $5::date)
          and ($6::text is null
            or starting_location = $6
            or starts_with(starting_location, $6 || ' - '))
          and ($7::text is null or travel_time = $7)
          and (not $8::boolean or is_duplicate_trip)
        order by ${ORDER_BY[filters.sort]}
        limit $2 offset $3
      `,
      [
        search,
        limit,
        offset,
        filters.travelFrom,
        filters.travelTo,
        filters.location,
        filters.time,
        filters.duplicatesOnly,
      ],
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

    return { items, total };
  }

  // Every booking for one travel day, ordered by departure time, so the admin
  // can see who is on which departure. `travelDate` is a `date` column, which
  // TypeORM's find() returns as a plain "YYYY-MM-DD" string.
  getReservationsByTravelDate(travelDate: string) {
    return this.reservationRepository.find({
      where: { travelDate },
      order: { travelTime: 'ASC', createdAt: 'ASC' },
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

  // Booking statistics for a travel-date range (inclusive), plus the totals of
  // the previous period of the same length for comparison. Everything is
  // grouped by TRAVEL date - when the passengers ride, not when they booked.
  async getAnalytics(from: string, to: string): Promise<ReservationAnalytics> {
    const lengthDays = (dayToMs(to) - dayToMs(from)) / DAY_MS + 1;
    const previousTo = msToDay(dayToMs(from) - DAY_MS);
    const previousFrom = msToDay(
      dayToMs(previousTo) - (lengthDays - 1) * DAY_MS,
    );

    type Count = { bookings: number; seats: number };
    const inRange = 'where travel_date between $1::date and $2::date';
    const params = [from, to];
    const city = "split_part(starting_location, ' - ', 1)";
    const counts =
      'count(*)::int as bookings, coalesce(sum(number_of_tickets), 0)::int as seats';

    const [totals, previousTotals, byDay, byDeparture, byStation, byWeekday] =
      await Promise.all([
        this.reservationRepository.query(
          `select ${counts} from reservations ${inRange}`,
          params,
        ) as Promise<Count[]>,
        this.reservationRepository.query(
          `select ${counts} from reservations ${inRange}`,
          [previousFrom, previousTo],
        ) as Promise<Count[]>,
        this.reservationRepository.query(
          `select travel_date::text as date, ${city} as city, ${counts}
           from reservations ${inRange} group by 1, 2 order by 1, 2`,
          params,
        ) as Promise<ReservationAnalytics['byDay']>,
        this.reservationRepository.query(
          `select ${city} as city, travel_time as time, ${counts}
           from reservations ${inRange} group by 1, 2 order by 1, 2`,
          params,
        ) as Promise<ReservationAnalytics['byDeparture']>,
        this.reservationRepository.query(
          `select starting_location as location, ${counts}
           from reservations ${inRange} group by 1 order by 1`,
          params,
        ) as Promise<ReservationAnalytics['byStation']>,
        this.reservationRepository.query(
          `select extract(isodow from travel_date)::int as weekday, ${counts}
           from reservations ${inRange} group by 1 order by 1`,
          params,
        ) as Promise<ReservationAnalytics['byWeekday']>,
      ]);

    return {
      range: { from, to },
      previousRange: { from: previousFrom, to: previousTo },
      totals: totals[0],
      previousTotals: previousTotals[0],
      byDay,
      byDeparture,
      byStation,
      byWeekday,
    };
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
