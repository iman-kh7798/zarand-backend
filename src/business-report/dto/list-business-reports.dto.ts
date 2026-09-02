import { BusinessReportStatus, BusinessReportType } from '@prisma/client';
import {
  IsBooleanString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** پارامترهای لیست گزارش‌ها در پنل مدیریت (owner و admin) */
export class ListBusinessReportsDto {
  @IsNumberString()
  @IsOptional()
  take?: number;

  @IsNumberString()
  @IsOptional()
  skip?: number;

  @IsUUID()
  @IsOptional()
  lastId?: string;

  /** فیلتر روی یک کسب‌وکار مشخص */
  @IsUUID()
  @IsOptional()
  businessId?: string;

  /** فیلتر روی نوع مشکل */
  @IsEnum(BusinessReportType)
  @IsOptional()
  type?: BusinessReportType;

  /** فیلتر روی وضعیت رسیدگی */
  @IsEnum(BusinessReportStatus)
  @IsOptional()
  status?: BusinessReportStatus;

  /** 'true' فقط خوانده‌شده‌ها، 'false' فقط خوانده‌نشده‌ها، خالی یعنی همه */
  @IsBooleanString()
  @IsOptional()
  isRead?: string;

  /** جست‌وجو روی عنوان کسب‌وکار یا متن توضیحات */
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;
}
