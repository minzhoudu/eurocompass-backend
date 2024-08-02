import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BcryptModule } from '@shared';

import { Address, User } from './entities';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address]), BcryptModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [],
})
export class UsersModule {}
