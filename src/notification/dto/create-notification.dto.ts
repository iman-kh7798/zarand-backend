import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationAudience } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * ساخت اعلان دستی.
 * ADMIN: هر مخاطبی مجاز است و اعلان بلافاصله ارسال می‌شود.
 * OWNER: فقط برای کاربران علاقه‌مند به کسب‌وکار خودش و پس از تایید ادمین.
 */
export class CreateNotificationDto {
  @ApiProperty({ description: 'عنوان اعلان' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @ApiProperty({ description: 'متن اعلان' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body: string;

  @ApiProperty({ enum: NotificationAudience })
  @IsEnum(NotificationAudience)
  audience: NotificationAudience;

  @ApiPropertyOptional({
    type: [String],
    description: 'فقط وقتی audience برابر USERS است — حداکثر ۵۰۰ کاربر',
  })
  @ValidateIf((o: CreateNotificationDto) => o.audience === NotificationAudience.USERS)
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'فقط وقتی audience برابر BUSINESS_OWNER یا BUSINESS_FAVORITES است',
  })
  @ValidateIf(
    (o: CreateNotificationDto) =>
      o.audience === NotificationAudience.BUSINESS_OWNER ||
      o.audience === NotificationAudience.BUSINESS_FAVORITES,
  )
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'علاوه بر اعلان، پیامک هم ارسال شود' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  sendSms?: boolean;

  @ApiPropertyOptional({ description: 'متن پیامک؛ خالی بماند از عنوان و متن اعلان ساخته می‌شود' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  smsText?: string;
}
