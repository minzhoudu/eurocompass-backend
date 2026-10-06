import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from 'src/audit/audit.service';
import { UserService } from 'src/user/user.service';
import { UserLoginDto } from './dto/user-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async login(userLoginDto: UserLoginDto, ip: string | null) {
    const user = await this.userService.getUserByEmail(userLoginDto.email);
    if (!user) {
      await this.recordFailedLogin(userLoginDto.email, ip);
      throw new BadRequestException('Email ili lozinka nisu ispravni');
    }

    const isPasswordValid = await this.userService.validatePassword(
      userLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.recordFailedLogin(userLoginDto.email, ip);
      throw new BadRequestException('Email ili lozinka nisu ispravni');
    }

    if (!user.isActive) {
      await this.recordFailedLogin(
        userLoginDto.email,
        ip,
        'nalog je deaktiviran',
      );
      throw new BadRequestException('Email ili lozinka nisu ispravni');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const jwt = await this.jwtService.signAsync(payload);

    await this.userService.updateLastLogin(user);
    await this.userService.touchActive(user.id);

    await this.auditService.record(
      {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        ip,
      },
      {
        action: 'auth.login',
        entityType: 'auth',
        summary: 'Prijava u admin panel',
      },
    );

    return jwt;
  }

  // The attempted address is stored as typed (the account may not exist), but
  // never the password. The actor is left empty so the entry is not mistaken
  // for something that account did.
  private async recordFailedLogin(
    email: string,
    ip: string | null,
    reason?: string,
  ) {
    await this.auditService.record(
      { email: null, name: null, ip },
      {
        action: 'auth.login_failed',
        entityType: 'auth',
        summary: `Neuspešna prijava za ${email.slice(0, 120)}${reason ? ` (${reason})` : ''}`,
        details: { email: email.slice(0, 120) },
      },
    );
  }
}
