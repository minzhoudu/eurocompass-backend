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
import { SaveNoticeDto } from './dto/SaveNoticeDto';
import { NoticesService } from './notices.service';

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  // Public: the site banner.
  @Get('active')
  getActiveNotices() {
    return this.noticesService.getActiveNotices();
  }

  @UseGuards(AuthGuard)
  @Get()
  getAllNotices() {
    return this.noticesService.getAllNotices();
  }

  @UseGuards(AuthGuard)
  @Post()
  createNotice(@Body() dto: SaveNoticeDto, @CurrentActor() actor: Actor) {
    return this.noticesService.createNotice(dto, actor);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  updateNotice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveNoticeDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.noticesService.updateNotice(id, dto, actor);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteNotice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    return this.noticesService.deleteNotice(id, actor);
  }
}
