import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationSmsWorker } from './notification-sms.worker';

/**
 * ماژول اعلان‌ها. مثل SmsModule سراسری است تا هر سرویسی
 * (business, business-review, business-report, auth) بتواند بدون
 * import اضافه، NotificationService را تزریق کند و رویداد بفرستد.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationSmsWorker],
  exports: [NotificationService],
})
export class NotificationModule {}
