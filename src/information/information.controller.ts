import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentActor } from 'src/auth/actor.decorator';
import { Actor } from 'src/audit/audit.types';
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
  updateInformation(
    @Body() info: UpdateInformationDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.informationService.updateInformation(info, actor);
  }
}
