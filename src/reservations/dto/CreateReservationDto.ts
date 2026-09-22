import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  startingLocation: string;

  @IsDateString()
  travelDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'travelTime must be in HH:MM format',
  })
  travelTime: string;

  @IsInt()
  @Min(1)
  numberOfTickets: number;

  @IsOptional()
  @IsString()
  note?: string;
}
