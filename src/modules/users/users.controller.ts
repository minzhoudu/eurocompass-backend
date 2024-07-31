import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';

import { CreateUserDto } from './dtos';
import { UsersService } from './users.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  async findUserById(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.findUserById(userId);
  }

  @Delete(':id')
  async deleteUserById(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.deleteUserById(userId);
  }
}
