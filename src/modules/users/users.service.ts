import { Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateUserDto } from './dtos';
import { UpdateUserDto } from './dtos/UpdateUserDto';
import { User } from './entities';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async findUserById(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAllUsers() {
    return await this.userRepo.find();
  }

  async createUser(createUserDto: CreateUserDto) {
    const userObject = this.userRepo.create(createUserDto);

    return await this.userRepo.save(userObject);
  }

  async updateUserById(userId: number, updateUserDto: UpdateUserDto) {
    const user = await this.findUserById(userId);

    this.userRepo.merge(user, updateUserDto);

    return await this.userRepo.save(user);
  }

  async deleteUserById(userId: number) {
    const user = await this.findUserById(userId);

    return await this.userRepo.remove(user);
  }
}
