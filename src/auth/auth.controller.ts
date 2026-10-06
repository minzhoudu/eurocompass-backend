import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { getClientIp } from './actor.decorator';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';
import { AuthGuard, TokenPayload } from './guards/auth.guard';
import { Request as ExpressRequest, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() userLoginDto: UserLoginDto,
    @Req() req: ExpressRequest,
    @Res() res: Response,
  ) {
    const accessToken = await this.authService.login(
      userLoginDto,
      getClientIp(req),
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return res.json({ message: 'Uspesno ste se ulogovali', accessToken });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

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
