/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsNumber,
  IsNumberString,
  IsUUID,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumberString()
  phone: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
