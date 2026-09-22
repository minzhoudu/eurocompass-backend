import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreateReservationDto } from './dto/CreateReservationDto';
import { CronGuard } from './guards/cron.guard';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  createReservation(@Body() dto: CreateReservationDto) {
    return this.reservationsService.createReservation(dto);
  }

  @UseGuards(AuthGuard)
  @Get()
  getReservations() {
    return this.reservationsService.getReservations();
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
