import { IsBoolean, IsNotEmpty } from 'class-validator';

/** تایید یا رد کردن یک نظر توسط مالک کسب‌وکار یا ادمین */
export class UpdateReviewStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isApproved: boolean;
}
