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
  createNotice(@Body() dto: SaveNoticeDto) {
    return this.noticesService.createNotice(dto);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  updateNotice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveNoticeDto,
  ) {
    return this.noticesService.updateNotice(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteNotice(@Param('id', ParseIntPipe) id: number) {
    return this.noticesService.deleteNotice(id);
  }
}
