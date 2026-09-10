import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** بازه‌ی زمانی آمار — پیش‌فرض همه‌ی زمان‌ها */
export type BusinessEventStatsRange = '7d' | '30d' | 'all';

export class BusinessEventStatsQueryDto {
  @ApiPropertyOptional({
    enum: ['7d', '30d', 'all'],
    default: 'all',
    description:
      'بازه‌ی زمانی آمار؛ اگر فرستاده نشود همه‌ی زمان‌ها حساب می‌شود',
  })
  @IsIn(['7d', '30d', 'all'])
  @IsOptional()
  range?: BusinessEventStatsRange;
}
