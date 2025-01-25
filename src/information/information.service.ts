import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Information } from './models/Information';
import { Repository } from 'typeorm';
import { UpdateInformationDto } from './dto/UpdateInformationDto';

@Injectable()
export class InformationService {
  constructor(
    @InjectRepository(Information)
    private informationRepository: Repository<Information>,
  ) {}

  async getInformation() {
    const info = await this.informationRepository.find();

    if (!info[0]) {
      return { message: 'No information found', info: null };
    }

    return {
      message: 'success',
      info: info[0],
    };
  }

  async updateInformation(info: UpdateInformationDto) {
    const information = await this.informationRepository.findOne({
      where: { id: info.id },
    });

    if (!information) {
      return { message: 'Information not found', info: null };
    }

    const updatedInfo = await this.informationRepository.save({
      ...information,
      ...info,
    });

    return {
      message: 'Information updated',
      info: updatedInfo,
    };
  }
}
