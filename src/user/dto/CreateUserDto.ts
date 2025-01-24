import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Polje Ime je obavezno' })
  firstName: string;

  @IsString({ message: 'Polje Prezime je obavezno' })
  lastName: string;

  @IsEmail({}, { message: 'Email adresa nije validna' })
  email: string;

  @IsString({ message: 'Polje Lozinka je obavezno' })
  password: string;
}
