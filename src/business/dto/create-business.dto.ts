/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  Matches,
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
}
export class CreateBusinessByUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string; // از bcrypt هش می‌کنیم بعد ذخیره می‌کنیم

  @IsString()
  name?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
