import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/CreateUserDto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getAllUsers() {
    return this.userService.getUsers();
  }

  @Post('create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.newUser(createUserDto);
  }
}
