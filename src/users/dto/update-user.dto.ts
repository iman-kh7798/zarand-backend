import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// نقش کاربر فقط هنگام ساخت تعیین می‌شود؛ ADMIN/OWNER تفاوت دسترسی بنیادی دارند
// (مثلاً فقط OWNER می‌تواند کسب‌وکار بسازد) و تغییر نقش بعد از ساخت می‌تواند
// وضعیت کسب‌وکارهای متصل یا دسترسی خودِ کاربر لاگین‌شده را نامعتبر کند.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['roleId'] as const),
) {}

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
