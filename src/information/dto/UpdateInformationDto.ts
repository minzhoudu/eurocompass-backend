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

  @IsOptional()
  @IsArray()
  startingTimesKrusevac?: string[];

  @IsOptional()
  @IsArray()
  startingTimesBeograd?: string[];

  @IsOptional()
  @IsArray()
  saturdayBeograd?: string[];
}
