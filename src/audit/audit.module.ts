import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './models/AuditLog';

// Global so any module can record an entry without importing this one.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), UserModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
