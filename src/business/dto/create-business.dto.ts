/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsUrl,
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

  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsString()
  @IsOptional()
  image?: string;
}
