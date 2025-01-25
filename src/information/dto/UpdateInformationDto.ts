import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateInformationDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  regularPrice?: string;

  @IsOptional()
  @IsString()
  roundtripPrice?: string;

  @IsOptional()
  @IsArray()
  importantInfo?: string[];
}
