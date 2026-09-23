import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreateReservationDto } from './dto/CreateReservationDto';
import { CronGuard } from './guards/cron.guard';
import { ReservationsService } from './reservations.service';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

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
  ) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(pageSizeParam) || DEFAULT_PAGE_SIZE),
    );
    const search = searchParam?.trim() || null;

    return this.reservationsService.getReservations(page, pageSize, search);
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
