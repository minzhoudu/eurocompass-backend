import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { NOTICE_SEVERITIES, NoticeSeverity } from '../models/Notice';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'must be a date in YYYY-MM-DD format';

export const NOTICE_MAX_LENGTH = 500;

// Used for both create and update (the admin form always sends every field);
// `null` / missing dates mean "no limit".
export class SaveNoticeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NOTICE_MAX_LENGTH)
  message: string;

  @IsIn(NOTICE_SEVERITIES)
  severity: NoticeSeverity;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: `startsOn ${DATE_MESSAGE}` })
  startsOn?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: `endsOn ${DATE_MESSAGE}` })
  endsOn?: string | null;

  @IsBoolean()
  isEnabled: boolean;
}
