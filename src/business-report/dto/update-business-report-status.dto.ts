import { BusinessReportStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

/** تغییر وضعیت رسیدگی به یک گزارش توسط مالک کسب‌وکار یا ادمین */
export class UpdateBusinessReportStatusDto {
  @IsEnum(BusinessReportStatus)
  @IsNotEmpty()
  status: BusinessReportStatus;
}
