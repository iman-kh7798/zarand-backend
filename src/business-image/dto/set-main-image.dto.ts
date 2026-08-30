import { IsUUID } from 'class-validator';

/**
 * پارامترهای مسیر `PATCH /business/:businessId/images/:imageId/set-main`.
 * کنترلر طبق کانونشن مخزن از `@Param('...')`های رشته‌ای استفاده می‌کند؛
 * این DTO برای مستندسازی و استفاده‌ی احتمالی با `@Param()` نگه داشته شده.
 */
export class SetMainImageParamsDto {
  @IsUUID()
  businessId: string;

  @IsUUID()
  imageId: string;
}

/** پاسخ ست‌کردن تصویر اصلی گالری کسب‌وکار */
export interface SetMainImageResponse {
  message: string;
  businessId: string;
  imageId: string;
}
