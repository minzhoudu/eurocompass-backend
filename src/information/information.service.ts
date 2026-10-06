import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Information } from './models/Information';
import { Repository } from 'typeorm';
import { UpdateInformationDto } from './dto/UpdateInformationDto';
import { Actor } from 'src/audit/audit.types';
import { AuditService } from 'src/audit/audit.service';
import { diffFields } from 'src/audit/audit.util';

const INFORMATION_FIELDS = [
  'regularPrice',
  'roundtripPrice',
  'studentPrice',
  'importantInfo',
  'startingTimesKrusevac',
  'startingTimesBeograd',
  'saturdayBeograd',
] as const;

// Serbian names of the fields, for the audit summary.
const FIELD_LABELS: Record<(typeof INFORMATION_FIELDS)[number], string> = {
  regularPrice: 'cena karte',
  roundtripPrice: 'cena povratne karte',
  studentPrice: 'cena studentske karte',
  importantInfo: 'važne informacije',
  startingTimesKrusevac: 'polasci iz Kruševca',
  startingTimesBeograd: 'polasci iz Beograda',
  saturdayBeograd: 'subotnji polasci iz Beograda',
};

@Injectable()
export class InformationService {
  constructor(
    @InjectRepository(Information)
    private informationRepository: Repository<Information>,
    private auditService: AuditService,
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

  async updateInformation(info: UpdateInformationDto, actor: Actor) {
    const information = await this.informationRepository.findOne({
      where: { id: info.id },
    });

    if (!information) {
      return { message: 'Information not found', info: null };
    }

    const changes = diffFields(information, info, INFORMATION_FIELDS);

    const updatedInfo = await this.informationRepository.save({
      ...information,
      ...info,
    });

    const changedLabels = Object.keys(changes).map(
      (field) => FIELD_LABELS[field as keyof typeof FIELD_LABELS],
    );

    if (changedLabels.length > 0) {
      await this.auditService.record(actor, {
        action: 'information.update',
        entityType: 'information',
        entityId: information.id,
        summary: `Izmenjene informacije: ${changedLabels.join(', ')}`,
        details: { changes },
      });
    }

    return {
      message: 'Information updated',
      info: updatedInfo,
    };
  }
}
