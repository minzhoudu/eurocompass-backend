import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto) {
    return await this.authService.login(userLoginDto);
  }

  @Get('me')
  getProfile(
    @Request()
    req: Request & {
      user: { email: string; firstName: string; lastName: string };
    },
  ) {
    return {
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };
  }
}
