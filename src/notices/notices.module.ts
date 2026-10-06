import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { Notice } from './models/Notice';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notice]), UserModule],
  controllers: [NoticesController],
  providers: [NoticesService],
})
export class NoticesModule {}
