import { BusinessReviewStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * تغییر وضعیت یک نظر توسط مالک کسب‌وکار یا ادمین.
 * APPROVED یعنی به کاربران عمومی نشان داده شود، REJECTED یعنی اسپم/نامناسب،
 * PENDING یعنی برگرداندن به صف بررسی.
 */
export class UpdateReviewStatusDto {
  @IsEnum(BusinessReviewStatus)
  status: BusinessReviewStatus;
}
