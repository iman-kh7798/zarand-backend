import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsEmail()
  @IsOptional()
  email?: string;

  // برای کاربرانی که فقط با OTP ثبت‌نام کرده‌اند و می‌خوان از پروفایل پسورد ست کنن
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  //   @Matches(/^(\+98|0098|0)?9\d{9}$/, {
  //     message: 'phone is not valid',
  //   })
  //   phone: string;
}
