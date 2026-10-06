import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Actor } from 'src/audit/audit.types';
import { AuditService } from 'src/audit/audit.service';
import { CreateUserDto } from './dto/CreateUserDto';
import { User } from './models/User';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async getUsers() {
    return this.userRepository.find();
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async newUser(createUserDto: CreateUserDto, actor: Actor): Promise<void> {
    const { firstName, lastName, email, password } = createUserDto;

    const existingUser = await this.userRepository.exists({ where: { email } });

    if (existingUser) {
      throw new HttpException(
        'Korisnik sa ovom email adresom već postoji',
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { identifiers } = await this.userRepository.insert({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await this.auditService.record(actor, {
      action: 'user.create',
      entityType: 'user',
      entityId: (identifiers[0] as { id?: number } | undefined)?.id,
      summary: `Dodat admin nalog: ${firstName} ${lastName} (${email})`,
      details: { email, firstName, lastName },
    });
  }

  async validatePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async updateLastLogin(user: User) {
    user.lastLogin = new Date().toLocaleString('sr-RS');
    await this.userRepository.save(user);
  }
}
