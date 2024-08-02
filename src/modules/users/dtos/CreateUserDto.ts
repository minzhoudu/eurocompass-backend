import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  IsStrongPassword,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty()
  @IsNumberString({}, { message: 'Invalid phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @ApiProperty()
  @IsStrongPassword(
    {
      minLength: 10,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 0,
      minSymbols: 0,
    },
    {
      message:
        'Password must contain minimum 10 characters and must include 1 lowercase and 1 uppercase letter',
    },
  )
  password: string;
}
