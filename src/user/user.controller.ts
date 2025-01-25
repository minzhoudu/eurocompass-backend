import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/CreateUserDto';
import { UserService } from './user.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAllUsers() {
    return this.userService.getUsers();
  }

  @UseGuards(AuthGuard)
  @Post('create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.newUser(createUserDto);
  }
}
