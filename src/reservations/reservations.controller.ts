import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { isRealDate } from 'src/common/date.util';
import { CreateReservationDto } from './dto/CreateReservationDto';
import { ReservationFiltersDto } from './dto/ReservationFiltersDto';
import { CronGuard } from './guards/cron.guard';
import {
  ReservationFilters,
  ReservationsService,
} from './reservations.service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Validates the optional list filters and fills in the defaults.
const parseFilters = (params: ReservationFiltersDto): ReservationFilters => {
  const { travelFrom, travelTo } = params;

  if (
    (travelFrom && !isRealDate(travelFrom)) ||
    (travelTo && !isRealDate(travelTo))
  ) {
    throw new BadRequestException('Datum nije ispravan');
  }

  if (travelFrom && travelTo && travelTo < travelFrom) {
    throw new BadRequestException(
      'Datum završetka ne može biti pre datuma početka',
    );
  }

  return {
    travelFrom: travelFrom || null,
    travelTo: travelTo || null,
    location: params.location?.trim() || null,
    time: params.time || null,
    duplicatesOnly: params.duplicatesOnly === 'true',
    sort: params.sort ?? 'newest',
  };
};

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  createReservation(@Body() dto: CreateReservationDto) {
    return this.reservationsService.createReservation(dto);
  }

  @UseGuards(AuthGuard)
  @Get()
  getReservations(
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
    @Query('search') searchParam?: string,
    @Query() filterParams: ReservationFiltersDto = {},
  ) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(pageSizeParam) || DEFAULT_PAGE_SIZE),
    );
    const search = searchParam?.trim() || null;

    return this.reservationsService.getReservations(
      page,
      pageSize,
      search,
      parseFilters(filterParams),
    );
  }

  // Same search and filters as the list, but every matching row as a CSV
  // (sent as a download; the admin app fetches it with its auth header).
  @UseGuards(AuthGuard)
  @Get('export')
  async exportReservations(
    @Res({ passthrough: true }) res: Response,
    @Query('search') searchParam?: string,
    @Query() filterParams: ReservationFiltersDto = {},
  ) {
    const csv = await this.reservationsService.exportReservationsCsv(
      searchParam?.trim() || null,
      parseFilters(filterParams),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rezervacije-${new Date().toISOString().slice(0, 10)}.csv"`,
    );

    return csv;
  }

  @UseGuards(AuthGuard)
  @Get('by-date')
  getReservationsByDate(@Query('date') date?: string) {
    const isValidDate =
      !!date &&
      DATE_PATTERN.test(date) &&
      !Number.isNaN(new Date(`${date}T00:00:00Z`).getTime());

    if (!isValidDate) {
      throw new BadRequestException('Datum mora biti u formatu YYYY-MM-DD');
    }

    return this.reservationsService.getReservationsByTravelDate(date);
  }

  @UseGuards(AuthGuard)
  @Get('stats')
  getStats() {
    return this.reservationsService.getStats();
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteReservation(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.deleteReservation(id);
  }

  @UseGuards(CronGuard)
  @Post('cleanup')
  cleanup() {
    return this.reservationsService.cleanupOldReservations();
  }
}
