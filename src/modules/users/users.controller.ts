import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { TypeormExceptionFilter } from '@shared';

import { CreateUserDto, UpdateUserDto } from './dtos';
import { UsersService } from './users.service';

@UseFilters(new TypeormExceptionFilter())
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Patch(':id')
  async updateUserInformations(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserInformations(userId, updateUserDto);
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
