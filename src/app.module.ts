import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { InformationModule } from './information/information.module';
import { ReservationsModule } from './reservations/reservations.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
    AuthModule,
    InformationModule,
    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
