import { IsBoolean, IsNotEmpty } from 'class-validator';

/** علامت‌گذاری یک پیشنهاد به‌عنوان خوانده‌شده / خوانده‌نشده توسط ادمین */
export class UpdateFeedbackReadDto {
  @IsBoolean()
  @IsNotEmpty()
  isRead: boolean;
}
