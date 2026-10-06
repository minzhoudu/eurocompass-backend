import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BlockedDatesModule } from './blocked-dates/blocked-dates.module';
import { DatabaseModule } from './database/database.module';
import { InformationModule } from './information/information.module';
import { NoticesModule } from './notices/notices.module';
import { ReservationsModule } from './reservations/reservations.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuditModule,
    UserModule,
    AuthModule,
    InformationModule,
    NoticesModule,
    BlockedDatesModule,
    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
