import { NotificationType } from '@prisma/client';

/** خروجی هر قالب: عنوان و متن اعلان + متن پیامک (در صورت نیاز) */
export interface NotificationContent {
  title: string;
  body: string;
  smsText?: string;
}

const panelHint = 'برای بررسی به پنل مراجعه کنید.';

/**
 * قالب‌های متنی اعلان‌های سیستمی — یک‌جا نگه داشته می‌شوند تا
 * تغییر متن‌ها نیازی به دست‌زدن به سرویس‌ها نداشته باشد.
 */
export const notificationTemplates = {
  [NotificationType.BUSINESS_CREATED]: (businessTitle: string, ownerName?: string | null): NotificationContent => ({
    title: 'ثبت کسب‌وکار جدید',
    body: `کسب‌وکار «${businessTitle}»${ownerName ? ` توسط ${ownerName}` : ''} ثبت شد و در انتظار بررسی است.`,
    smsText: `کسب‌وکار جدید «${businessTitle}» ثبت شد و در انتظار تایید است. ${panelHint}`,
  }),

  [NotificationType.BUSINESS_APPROVED]: (businessTitle: string): NotificationContent => ({
    title: 'کسب‌وکار شما تایید شد',
    body: `کسب‌وکار «${businessTitle}» تایید شد و از این پس در سایت نمایش داده می‌شود.`,
    smsText: `کسب‌وکار «${businessTitle}» تایید شد و در سایت نمایش داده می‌شود.`,
  }),

  [NotificationType.BUSINESS_REJECTED]: (businessTitle: string, reason?: string | null): NotificationContent => ({
    title: 'کسب‌وکار شما رد شد',
    body: `کسب‌وکار «${businessTitle}» تایید نشد.${reason ? ` دلیل: ${reason}` : ''}`,
    smsText: `کسب‌وکار «${businessTitle}» تایید نشد.${reason ? ` دلیل: ${reason}` : ''} ${panelHint}`,
  }),

  // برای نظر جدید طبق نیازمندی فقط اعلان می‌رود و پیامکی ارسال نمی‌شود
  [NotificationType.REVIEW_CREATED]: (businessTitle: string, isReply: boolean): NotificationContent => ({
    title: isReply ? 'پاسخ جدید به یک نظر' : 'نظر جدید برای کسب‌وکار شما',
    body: `${isReply ? 'یک پاسخ جدید' : 'یک نظر جدید'} برای کسب‌وکار «${businessTitle}» ثبت شد و در انتظار بررسی است.`,
  }),

  [NotificationType.BUSINESS_REPORT_CREATED]: (businessTitle: string): NotificationContent => ({
    title: 'گزارش اصلاح اطلاعات',
    body: `یک گزارش اصلاح اطلاعات برای کسب‌وکار «${businessTitle}» ثبت شد.`,
    smsText: `گزارش اصلاح اطلاعات جدیدی ثبت شد. ${panelHint}`,
  }),

  [NotificationType.USER_WELCOME]: (name?: string | null): NotificationContent => ({
    title: 'به زرند خوش آمدید',
    body: `${name ? `${name} عزیز، ` : ''}به سامانه‌ی زرند خوش آمدید. با ثبت کسب‌وکارتان می‌توانید در معرض دید مردم شهر قرار بگیرید.`,
    smsText: `${name ? `${name} عزیز، ` : ''}به سامانه‌ی زرند خوش آمدید.`,
  }),
};
