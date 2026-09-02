import {
  IsBooleanString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** پارامترهای لیست پیشنهادها در پنل مدیریت (فقط ادمین) */
export class ListFeedbackDto {
  @IsNumberString()
  @IsOptional()
  take?: number;

  @IsNumberString()
  @IsOptional()
  skip?: number;

  @IsUUID()
  @IsOptional()
  lastId?: string;

  /** جست‌وجو روی نام، راه ارتباطی یا متن پیام */
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  /** 'true' فقط خوانده‌شده‌ها، 'false' فقط خوانده‌نشده‌ها، خالی یعنی همه */
  @IsBooleanString()
  @IsOptional()
  isRead?: string;
}
