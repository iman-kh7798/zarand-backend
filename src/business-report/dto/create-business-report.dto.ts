import { BusinessReportType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * ورودی فرم «گزارش اصلاح اطلاعات» — عمومی است و نیاز به لاگین ندارد.
 * برای اضافه‌کردن نوع مشکل جدید کافی است به enum `BusinessReportType` در schema اضافه شود.
 */
export class CreateBusinessReportDto {
  // شناسه‌ی کسب‌وکاری که گزارش برای آن ثبت می‌شود
  @IsUUID()
  @IsNotEmpty()
  businessId: string;

  // نوع مشکل — طبق لیست ثابت
  @IsEnum(BusinessReportType)
  @IsNotEmpty()
  type: BusinessReportType;

  /**
   * توضیحات. برای «کسب‌وکار تعطیل شده» و «مورد تکراری» اختیاری است،
   * برای «اطلاعات نادرست» و «موضوع دیگر» الزامی است.
   * وقتی مقدار داشته باشد در هر حالتی به‌عنوان رشته اعتبارسنجی می‌شود.
   */
  @ValidateIf(
    (o: CreateBusinessReportDto) =>
      o.type === BusinessReportType.INCORRECT_INFO ||
      o.type === BusinessReportType.OTHER ||
      (o.description !== undefined && o.description !== ''),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description?: string;
}
