import { Repository } from 'typeorm';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BcryptService } from '@shared';

import { CreateUserDto, UpdateUserDto } from './dtos';
import { User } from './entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private BcryptService: BcryptService,
  ) {}

  async getAllUsers() {
    return await this.userRepo.find();
  }

  async findUserById(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    const userExists = await this.userRepo.existsBy({
      email: createUserDto.email,
    });

    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.BcryptService.hashPassword(
      createUserDto.password,
    );

    const userObject = this.userRepo.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepo.save(userObject);
  }

  async updateUserInformations(userId: number, updateUserDto: UpdateUserDto) {
    console.log(updateUserDto);
    const user = await this.findUserById(userId);

    this.userRepo.merge(user, updateUserDto);

    return await this.userRepo.save(user);
  }

  async deleteUserById(userId: number) {
    const user = await this.findUserById(userId);

    return await this.userRepo.remove(user);
  }
}
