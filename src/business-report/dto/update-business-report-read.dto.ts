import { IsBoolean, IsNotEmpty } from 'class-validator';

/** علامت‌گذاری یک گزارش به‌عنوان خوانده‌شده / خوانده‌نشده */
export class UpdateBusinessReportReadDto {
  @IsBoolean()
  @IsNotEmpty()
  isRead: boolean;
}
