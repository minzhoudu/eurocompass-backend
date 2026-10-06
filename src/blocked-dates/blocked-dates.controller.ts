import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentActor } from 'src/auth/actor.decorator';
import { Actor } from 'src/audit/audit.types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { BlockedDatesService } from './blocked-dates.service';
import { SaveBlockedDateDto } from './dto/SaveBlockedDateDto';

@Controller('blocked-dates')
export class BlockedDatesController {
  constructor(private readonly blockedDatesService: BlockedDatesService) {}

  // Public: the booking form hides these days / departures.
  @Get('upcoming')
  getUpcomingBlockedDates() {
    return this.blockedDatesService.getUpcomingBlockedDates();
  }

  @UseGuards(AuthGuard)
  @Get()
  getAllBlockedDates() {
    return this.blockedDatesService.getAllBlockedDates();
  }

  @UseGuards(AuthGuard)
  @Post()
  createBlockedDate(
    @Body() dto: SaveBlockedDateDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.blockedDatesService.createBlockedDate(dto, actor);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  updateBlockedDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveBlockedDateDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.blockedDatesService.updateBlockedDate(id, dto, actor);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteBlockedDate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    return this.blockedDatesService.deleteBlockedDate(id, actor);
  }
}
