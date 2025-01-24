import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';
import { AuthGuard, TokenPayload } from './guards/auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto, @Res() res: Response) {
    const accessToken = await this.authService.login(userLoginDto);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
    });

    return res.json({ message: 'Uspesno ste se ulogovali' });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('accessToken');

    return res.json({ message: 'Uspesno ste se izlogovali' });
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getProfile(
    @Request()
    req: Request & {
      user: TokenPayload;
    },
  ) {
    return req.user;
  }
}
