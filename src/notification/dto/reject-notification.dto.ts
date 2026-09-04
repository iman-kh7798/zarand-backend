import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** رد کردن اعلانِ ساخته‌ی مالک توسط ادمین */
export class RejectNotificationDto {
  @ApiPropertyOptional({ description: 'دلیل رد شدن' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
