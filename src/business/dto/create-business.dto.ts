/* eslint-disable @typescript-eslint/no-unsafe-call */
import { SocialPlatform } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumberString,
  IsUUID,
  IsEnum,
  IsUrl,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBusinessSocialLinkDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsUrl()
  @IsNotEmpty()
  url: string;
}

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

  @IsNumberString()
  @IsOptional()
  lat?: string;

  @IsNumberString()
  @IsOptional()
  lng?: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateBusinessSocialLinkDto)
  @IsOptional()
  socialLinks?: CreateBusinessSocialLinkDto[];

  /**
   * ایندکس تصویر کاور/اصلی داخل آرایه‌ی فایل‌های آپلودی (`files`).
   * ورودی multipart رشته است، پس `IsNumberString`. اگر ارسال نشود یا نامعتبر
   * باشد، اولین تصویر به‌عنوان اصلی در نظر گرفته می‌شود.
   */
  @ValidateIf(
    (o: CreateBusinessDto) =>
      o.mainImageIndex !== undefined && o.mainImageIndex !== '',
  )
  @IsNumberString()
  mainImageIndex?: string;
}
