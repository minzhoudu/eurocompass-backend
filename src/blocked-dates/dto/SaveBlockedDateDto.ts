import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const BLOCKED_REASON_MAX_LENGTH = 200;

// Used for create and update (the admin form always sends every field).
// Empty/missing endsOn = the same day as startsOn; empty city/time/reason =
// no restriction / no reason.
export class SaveBlockedDateDto {
  @Matches(DATE_PATTERN, { message: 'startsOn must be YYYY-MM-DD' })
  startsOn: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'endsOn must be YYYY-MM-DD' })
  endsOn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'time must be HH:MM' })
  time?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(BLOCKED_REASON_MAX_LENGTH)
  reason?: string | null;
}
