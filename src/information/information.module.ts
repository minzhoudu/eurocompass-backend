import { Module } from '@nestjs/common';
import { InformationController } from './information.controller';
import { InformationService } from './information.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Information } from './models/Information';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Information]), UserModule],
  controllers: [InformationController],
  providers: [InformationService],
})
export class InformationModule {}
