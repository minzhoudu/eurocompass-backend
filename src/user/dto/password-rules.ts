import { applyDecorators } from '@nestjs/common';
import { MaxLength, MinLength } from 'class-validator';

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignores everything after 72 bytes, so longer passwords would be
// silently truncated.
export const MAX_PASSWORD_LENGTH = 72;

export const PASSWORD_RULES = applyDecorators(
  MinLength(MIN_PASSWORD_LENGTH, {
    message: `Lozinka mora imati najmanje ${MIN_PASSWORD_LENGTH} karaktera`,
  }),
  MaxLength(MAX_PASSWORD_LENGTH, {
    message: `Lozinka može imati najviše ${MAX_PASSWORD_LENGTH} karaktera`,
  }),
);
