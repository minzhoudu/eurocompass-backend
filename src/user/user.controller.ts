import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentActor } from 'src/auth/actor.decorator';
import { Actor } from 'src/audit/audit.types';
import { Roles } from 'src/auth/roles.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateUserDto } from './dto/CreateUserDto';
import { ResetPasswordDto } from './dto/ResetPasswordDto';
import { UpdateUserDto } from './dto/UpdateUserDto';
import { UserService } from './user.service';

// Managing admin accounts is for owners only.
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('owner')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  getAllUsers() {
    return this.userService.getUsers();
  }

  // "create" is the original path, kept so existing callers keep working.
  @Post(['', 'create'])
  createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.userService.newUser(createUserDto, actor);
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.userService.updateUser(id, dto, actor);
  }

  @Post(':id/password')
  @HttpCode(204)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentActor() actor: Actor,
  ) {
    await this.userService.resetPassword(id, dto.password, actor);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: Actor,
  ) {
    await this.userService.deleteUser(id, actor);
  }
}
