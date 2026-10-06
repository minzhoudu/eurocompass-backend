import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { BlockedDatesController } from './blocked-dates.controller';
import { BlockedDatesService } from './blocked-dates.service';
import { BlockedDate } from './models/BlockedDate';

@Module({
  imports: [TypeOrmModule.forFeature([BlockedDate]), UserModule],
  controllers: [BlockedDatesController],
  providers: [BlockedDatesService],
  exports: [BlockedDatesService],
})
export class BlockedDatesModule {}
