import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationSmsStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SmsService } from 'src/sms/sms.service';

/** حداکثر تلاش برای هر پیامک؛ بعد از آن FAILED می‌شود */
const MAX_ATTEMPTS = 3;
/** تعداد پیامکی که در هر دور از صف برداشته می‌شود */
const BATCH_SIZE = Number(process.env.NOTIFICATION_SMS_BATCH ?? 50);
/** فاصله‌ی دورهای صف (میلی‌ثانیه) */
const TICK_MS = Number(process.env.NOTIFICATION_SMS_INTERVAL_MS ?? 20_000);

/**
 * فرستنده‌ی صف پیامکِ اعلان‌ها (outbox).
 *
 * چرا صف: ارسال پیامک کند و شکست‌پذیر است؛ اگر داخل request انجام شود
 * هم پاسخ API را کند می‌کند و هم با یک خطای کاوه‌نگار کل عملیات
 * (ثبت کسب‌وکار، تغییر وضعیت و ...) شکست می‌خورد. اینجا ردیف‌های
 * `NotificationRecipient` با وضعیت PENDING دسته‌ای برداشته و با تلاش مجدد
 * ارسال می‌شوند. کل صف با ایندکس (smsStatus, smsAttempts, createdAt) خوانده می‌شود.
 */
@Injectable()
export class NotificationSmsWorker {
  private readonly logger = new Logger(NotificationSmsWorker.name);
  /** جلوگیری از هم‌پوشانی دو دور در صورت کند بودن ارسال */
  private running = false;

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
  ) {}

  @Interval('notification-sms-outbox', TICK_MS)
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.drain();
    } catch (e) {
      this.logger.error('sms outbox tick failed', e as Error);
    } finally {
      this.running = false;
    }
  }

  private async drain() {
    const batch = await this.prisma.notificationRecipient.findMany({
      where: {
        smsStatus: NotificationSmsStatus.PENDING,
        smsAttempts: { lt: MAX_ATTEMPTS },
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        smsAttempts: true,
        user: { select: { phone: true, isActive: true } },
        notification: { select: { title: true, body: true, smsText: true } },
      },
    });
    if (!batch.length) return;

    for (const row of batch) {
      const phone = row.user?.phone;
      if (!phone || !row.user.isActive) {
        await this.prisma.notificationRecipient.update({
          where: { id: row.id },
          data: {
            smsStatus: NotificationSmsStatus.SKIPPED,
            smsError: 'NO_PHONE_OR_INACTIVE',
          },
        });
        continue;
      }

      const message =
        row.notification.smsText?.trim() ||
        `${row.notification.title}\n${row.notification.body}`;

      try {
        await this.sms.sendRaw(phone, message);
        await this.prisma.notificationRecipient.update({
          where: { id: row.id },
          data: {
            smsStatus: NotificationSmsStatus.SENT,
            smsAttempts: row.smsAttempts + 1,
            smsSentAt: new Date(),
            smsError: null,
          },
        });
      } catch (e) {
        const attempts = row.smsAttempts + 1;
        await this.prisma.notificationRecipient.update({
          where: { id: row.id },
          data: {
            // تا سقف تلاش، PENDING می‌ماند تا دور بعد دوباره امتحان شود
            smsStatus:
              attempts >= MAX_ATTEMPTS
                ? NotificationSmsStatus.FAILED
                : NotificationSmsStatus.PENDING,
            smsAttempts: attempts,
            smsError: (e as Error)?.message?.slice(0, 500) ?? 'SMS_FAILED',
          },
        });
        this.logger.warn(
          `sms to ${phone} failed (attempt ${attempts}): ${(e as Error)?.message}`,
        );
      }
    }
  }
}
