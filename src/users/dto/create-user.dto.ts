/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string; // از bcrypt هش می‌کنیم بعد ذخیره می‌کنیم

  @IsString()
  name?: string;

  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsNumber()
  @IsNotEmpty()
  roleId: number; // FK → Role (مثلاً admin=1, owner=2, customer=3)
}
