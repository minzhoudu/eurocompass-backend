import { IsString } from 'class-validator';
import { PASSWORD_RULES } from './password-rules';

export class ResetPasswordDto {
  @IsString({ message: 'Polje Lozinka je obavezno' })
  @PASSWORD_RULES
  password: string;
}
