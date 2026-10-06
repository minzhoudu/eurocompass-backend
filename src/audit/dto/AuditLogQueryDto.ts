import { IsIn, IsOptional, IsString } from 'class-validator';
import { AUDIT_ENTITY_TYPES } from '../audit.types';

export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsIn(AUDIT_ENTITY_TYPES)
  entityType?: string;

  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
