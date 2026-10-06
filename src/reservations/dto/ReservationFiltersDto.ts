import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const RESERVATION_SORTS = [
  'newest',
  'travel_asc',
  'travel_desc',
] as const;

export type ReservationSort = (typeof RESERVATION_SORTS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Optional filters for the admin reservations list. Query-string values, so
// everything arrives as a string.
export class ReservationFiltersDto {
  // Inclusive travel-date range.
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'travelFrom must be YYYY-MM-DD' })
  travelFrom?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'travelTo must be YYYY-MM-DD' })
  travelTo?: string;

  // A city ("Kruševac" = all its stations) or one full station name.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'time must be HH:MM' })
  time?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  duplicatesOnly?: string;

  @IsOptional()
  @IsIn(RESERVATION_SORTS)
  sort?: ReservationSort;
}
