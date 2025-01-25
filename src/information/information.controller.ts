import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { UpdateInformationDto } from './dto/UpdateInformationDto';
import { InformationService } from './information.service';

@Controller('information')
export class InformationController {
  constructor(private readonly informationService: InformationService) {}

  @Get()
  getInformation() {
    return this.informationService.getInformation();
  }

  @UseGuards(AuthGuard)
  @Patch()
  updateInformation(@Body() info: UpdateInformationDto) {
    return this.informationService.updateInformation(info);
  }
}
