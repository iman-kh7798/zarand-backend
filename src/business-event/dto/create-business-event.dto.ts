import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessEventType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * ورودی ثبت رویداد آنالیتیکسِ سبک روی پروفایل کسب‌وکار — عمومی است و نیاز به لاگین ندارد.
 */
export class CreateBusinessEventDto {
  @ApiProperty({
    enum: BusinessEventType,
    example: BusinessEventType.PROFILE_VIEW,
  })
  @IsEnum(BusinessEventType)
  @IsNotEmpty()
  type: BusinessEventType;

  @ApiPropertyOptional({
    description: 'اطلاعات تکمیلی اختیاری',
    example: { platform: 'instagram' },
  })
  @IsObject()
  @IsOptional()
  meta?: Record<string, unknown>;

  @ApiProperty({
    maxLength: 100,
    description:
      'شناسه‌ی ناشناسِ ساخته‌شده در کلاینت (نه حساب کاربری) — برای دیدوپلیکیت استفاده می‌شود',
    example: 'a1b2c3d4-anon-visitor-id',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorId: string;
}
