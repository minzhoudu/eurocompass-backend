import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { USER_ROLES } from '../user-role';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Polje Ime je obavezno' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Polje Prezime je obavezno' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email adresa nije validna' })
  email?: string;

  @IsOptional()
  @IsIn(USER_ROLES, { message: 'Uloga nije ispravna' })
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
