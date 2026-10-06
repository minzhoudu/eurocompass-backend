import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Actor } from 'src/audit/audit.types';
import { AuditService } from 'src/audit/audit.service';
import { diffFields } from 'src/audit/audit.util';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/UpdateUserDto';
import { User } from './models/User';
import { ROLE_LABELS, UserRole } from './user-role';

const USER_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'role',
  'isActive',
] as const;

// What the admin-management page gets. Never the password hash.
const toSummary = (user: User) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
});

const fullName = (user: Pick<User, 'firstName' | 'lastName'>) =>
  `${user.firstName} ${user.lastName}`.trim();

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async getUsers() {
    const users = await this.userRepository.find({ order: { id: 'ASC' } });

    return users.map(toSummary);
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async getUserById(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  async newUser(createUserDto: CreateUserDto, actor: Actor) {
    const firstName = createUserDto.firstName.trim();
    const lastName = createUserDto.lastName.trim();
    const email = createUserDto.email.trim();
    const role = (createUserDto.role as UserRole | undefined) ?? 'admin';

    this.assertNamesPresent(firstName, lastName);
    await this.assertEmailFree(email);

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userRepository.save(
      this.userRepository.create({
        firstName,
        lastName,
        email,
        role,
        isActive: true,
        password: hashedPassword,
      }),
    );

    await this.auditService.record(actor, {
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      summary: `Dodat nalog: ${fullName(user)} (${email}), uloga: ${ROLE_LABELS[role]}`,
      details: { snapshot: { firstName, lastName, email, role } },
    });

    return toSummary(user);
  }

  async updateUser(id: number, dto: UpdateUserDto, actor: Actor) {
    const user = await this.findOrFail(id);
    this.assertNotSelf(
      user,
      actor,
      dto.role !== undefined || dto.isActive !== undefined
        ? { role: dto.role, isActive: dto.isActive }
        : {},
    );

    const values: Partial<Pick<User, (typeof USER_FIELDS)[number]>> = {};

    if (dto.firstName !== undefined) values.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) values.lastName = dto.lastName.trim();
    if (dto.email !== undefined) values.email = dto.email.trim();
    if (dto.role !== undefined) values.role = dto.role as UserRole;
    if (dto.isActive !== undefined) values.isActive = dto.isActive;

    this.assertNamesPresent(
      values.firstName ?? user.firstName,
      values.lastName ?? user.lastName,
    );

    if (values.email !== undefined && values.email !== user.email) {
      await this.assertEmailFree(values.email, user.id);
    }

    const changes = diffFields(user, values, USER_FIELDS);

    if (Object.keys(changes).length === 0) return toSummary(user);

    const updated = await this.userRepository.save({ ...user, ...values });

    await this.auditService.record(actor, {
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      summary: this.describeUpdate(updated, changes),
      details: { changes },
    });

    return toSummary(updated);
  }

  // The owner sets a new password for someone. Everyone else's existing
  // sessions stop working; the owner's own session is kept.
  async resetPassword(id: number, password: string, actor: Actor) {
    const user = await this.findOrFail(id);
    const isSelf = user.email === actor.email;

    await this.userRepository.save({
      ...user,
      password: await bcrypt.hash(password, 10),
      tokensValidAfter: isSelf ? user.tokensValidAfter : new Date(),
    });

    await this.auditService.record(actor, {
      action: 'user.password_reset',
      entityType: 'user',
      entityId: id,
      summary: `Postavljena nova lozinka za nalog: ${fullName(user)} (${user.email})`,
    });
  }

  async deleteUser(id: number, actor: Actor) {
    const user = await this.findOrFail(id);
    this.assertNotSelf(user, actor, { delete: true });

    await this.userRepository.delete({ id });

    await this.auditService.record(actor, {
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
      summary: `Obrisan nalog: ${fullName(user)} (${user.email})`,
      details: {
        snapshot: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
    });
  }

  async validatePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }

  async updateLastLogin(user: User) {
    user.lastLogin = new Date().toLocaleString('sr-RS');
    await this.userRepository.save(user);
  }

  private async findOrFail(id: number) {
    const user = await this.getUserById(id);

    if (!user) throw new NotFoundException('Nalog nije pronađen');

    return user;
  }

  // Only owners get this far, so as long as an owner cannot demote,
  // deactivate or delete their OWN account, at least one active owner always
  // remains. (Changing your own name, email or password is fine.)
  private assertNotSelf(
    user: User,
    actor: Actor,
    change: { role?: string; isActive?: boolean; delete?: boolean },
  ) {
    if (user.email !== actor.email) return;

    if (change.delete) {
      throw new BadRequestException('Ne možete obrisati sopstveni nalog');
    }

    if (change.isActive === false) {
      throw new BadRequestException('Ne možete deaktivirati sopstveni nalog');
    }

    if (change.role !== undefined && change.role !== user.role) {
      throw new BadRequestException('Ne možete promeniti sopstvenu ulogu');
    }
  }

  private assertNamesPresent(firstName: string, lastName: string) {
    if (!firstName || !lastName) {
      throw new BadRequestException('Ime i prezime su obavezni');
    }
  }

  private async assertEmailFree(email: string, exceptId?: number) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('lower(user.email) = lower(:email)', { email });

    if (exceptId !== undefined)
      query.andWhere('user.id != :exceptId', { exceptId });

    if (await query.getExists()) {
      throw new ConflictException('Korisnik sa ovom email adresom već postoji');
    }
  }

  private describeUpdate(
    user: User,
    changes: Record<string, [unknown, unknown]>,
  ) {
    const who = `${fullName(user)} (${user.email})`;

    if (changes.isActive) {
      return `${user.isActive ? 'Aktiviran' : 'Deaktiviran'} nalog: ${who}`;
    }

    if (changes.role) {
      return `Promenjena uloga: ${who}, ${ROLE_LABELS[changes.role[0] as UserRole]} → ${ROLE_LABELS[changes.role[1] as UserRole]}`;
    }

    return `Izmenjen nalog: ${who}`;
  }
}
