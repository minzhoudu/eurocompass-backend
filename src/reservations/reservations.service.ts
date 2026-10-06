import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Actor, SYSTEM_ACTOR } from 'src/audit/audit.types';
import { AuditService } from 'src/audit/audit.service';
import { clip, formatDay } from 'src/audit/audit.util';
import { isRealDate } from 'src/common/date.util';
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

// A person needs several seconds to pick a station, a date and a time.
const MIN_FILL_TIME_MS = 3000;
// How many bookings one email / phone number / everyone together may create.
// Generous for a real customer or a travel agent, far below a flood.
const MAX_PER_EMAIL_PER_HOUR = 10;
const MAX_PER_PHONE_PER_HOUR = 15;
const MAX_ALL_PER_10_MINUTES = 300;
const MAX_DAYS_AHEAD = 400;

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
    private auditService: AuditService,
  ) {}

  async createReservation(dto: CreateReservationDto) {
    // Bot traps: answered like a success so a script learns nothing, but
    // nothing is saved.
    if (
      dto.hp ||
      (dto.elapsedMs !== undefined && dto.elapsedMs < MIN_FILL_TIME_MS)
    ) {
      this.logger.warn('Reservation dropped by bot check');

      return { id: 0 };
    }

    this.assertSensibleTravelDate(dto.travelDate);
    await this.assertWithinRateLimits(dto);

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

  // Rejects a date that is not a real day, is long past, or is further ahead
  // than reservations are kept for. (Yesterday is allowed: Belgrade is ahead of
  // UTC and a page may have been open over midnight.)
  private assertSensibleTravelDate(travelDate: string) {
    const day = travelDate.slice(0, 10);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
    }).format(new Date());
    const shift = (days: number) =>
      new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000)
        .toISOString()
        .slice(0, 10);

    if (!isRealDate(day) || day < shift(-1) || day > shift(MAX_DAYS_AHEAD)) {
      throw new BadRequestException('Datum polaska nije ispravan.');
    }
  }

  // Counted from the table itself (no IP needed, which is unreliable behind a
  // hosting proxy), so it also holds across restarts.
  private async assertWithinRateLimits(dto: CreateReservationDto) {
    const email = dto.email.trim().toLowerCase();
    // Digits only, with the Serbian country code folded into the leading 0, so
    // "+381 63 123 456", "00381631 23456" and "063/123-456" count as one number.
    const phoneDigits = dto.phone.replace(/\D/g, '').replace(/^(00)?381/, '0');

    const [byEmail, byPhone, overall] = await Promise.all([
      this.reservationRepository
        .createQueryBuilder('r')
        .where('lower(trim(r.email)) = :email', { email })
        .andWhere("r.createdAt > now() - interval '1 hour'")
        .getCount(),
      phoneDigits.length >= 6
        ? this.reservationRepository
            .createQueryBuilder('r')
            .where(
              "regexp_replace(regexp_replace(r.phone, '\\D', '', 'g'), '^(00)?381', '0') = :phoneDigits",
              { phoneDigits },
            )
            .andWhere("r.createdAt > now() - interval '1 hour'")
            .getCount()
        : Promise.resolve(0),
      this.reservationRepository
        .createQueryBuilder('r')
        .where("r.createdAt > now() - interval '10 minutes'")
        .getCount(),
    ]);

    if (
      byEmail >= MAX_PER_EMAIL_PER_HOUR ||
      byPhone >= MAX_PER_PHONE_PER_HOUR ||
      overall >= MAX_ALL_PER_10_MINUTES
    ) {
      this.logger.warn(
        `Reservation rate limit hit (email ${byEmail}, phone ${byPhone}, all ${overall})`,
      );

      throw new HttpException(
        'Previše rezervacija za kratko vreme. Pokušajte ponovo kasnije.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
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
    actor: Actor,
  ) {
    const { items } = await this.findReservations(
      search,
      filters,
      MAX_EXPORT_ROWS,
      0,
    );

    // Passenger data leaves the system here, so it is always recorded.
    await this.auditService.record(actor, {
      action: 'reservation.export',
      entityType: 'reservation',
      summary: `Izvezeno ${items.length} rezervacija (CSV)`,
      details: { count: items.length, search, filters },
    });

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

  async deleteReservation(id: number, actor: Actor) {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });

    await this.reservationRepository.delete({ id });

    if (reservation) {
      // Contact details are left out on purpose: the log should not outlive
      // the passenger data it describes.
      await this.auditService.record(actor, {
        action: 'reservation.delete',
        entityType: 'reservation',
        entityId: id,
        summary: `Obrisana rezervacija: ${clip(reservation.fullName, 40)}, ${formatDay(reservation.travelDate)} ${reservation.travelTime}, ${reservation.startingLocation}`,
        details: {
          snapshot: {
            fullName: reservation.fullName,
            startingLocation: reservation.startingLocation,
            travelDate: reservation.travelDate,
            travelTime: reservation.travelTime,
            numberOfTickets: reservation.numberOfTickets,
          },
        },
      });
    }
  }

  async cleanupOldReservations() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

    const result = await this.reservationRepository.delete({
      createdAt: LessThan(cutoff),
    });
    const deletedCount = result.affected ?? 0;
    const prunedAuditEntries = await this.auditService.deleteExpired();

    if (deletedCount > 0) {
      await this.auditService.record(SYSTEM_ACTOR, {
        action: 'reservation.cleanup',
        entityType: 'reservation',
        summary: `Automatski obrisano ${deletedCount} starih rezervacija`,
        details: { deletedCount, olderThan: cutoff.toISOString() },
      });
    }

    this.logger.log(
      `Reservation cleanup ran: deleted ${deletedCount} reservation(s) created before ${cutoff.toISOString()}`,
    );

    return { deletedCount, prunedAuditEntries };
  }
}
