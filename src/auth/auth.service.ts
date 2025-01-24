import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { UserLoginDto } from './dto/user-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(userLoginDto: UserLoginDto) {
    const user = await this.userService.getUserByEmail(userLoginDto.email);
    if (!user) {
      throw new BadRequestException('Email ili lozinka nisu ispravni');
    }

    const isPasswordValid = await this.userService.validatePassword(
      userLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Email ili lozinka nisu ispravni');
    }

    const payload = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
