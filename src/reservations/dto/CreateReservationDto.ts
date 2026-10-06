import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Keep in step with the limits in the booking form (eurocompass-simple).
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PHONE_LENGTH = 30;
export const MAX_LOCATION_LENGTH = 100;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_TICKETS = 50;

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  fullName: string;

  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PHONE_LENGTH)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_LOCATION_LENGTH)
  startingLocation: string;

  @IsDateString()
  travelDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'travelTime must be in HH:MM format',
  })
  travelTime: string;

  @IsInt()
  @Min(1)
  @Max(MAX_TICKETS)
  numberOfTickets: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  note?: string;

  // Bot checks sent by the booking form. `hp` is a hidden field a person never
  // fills in; `elapsedMs` is how long the form was open. Both are optional so
  // older pages and direct API users still work.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hp?: string;

  @IsOptional()
  @IsNumber()
  elapsedMs?: number;
}
