// i want to import from @types/kavenegar how to do that?

import { Injectable } from '@nestjs/common';

const Kavenegar = require('kavenegar');

@Injectable()
export class SmsService {
  private readonly kavenegar;
  constructor() {
    const apiKey = process.env.KAVENEGAR_API_KEY;
    this.kavenegar = Kavenegar.KavenegarApi({ apikey: apiKey });
  }

  sendCode(phone: string, code: string) {
    const sender = process.env.KAVENEGAR_SENDER || '10008663';
    const message = `Your verification code is: ${code} Zarand Backend :)`;
    this.kavenegar.Send({
      message,
      sender,
      receptor: phone,
    });
    console.log(`Sent verification code to ${phone}: ${code}`);
  }

  /**
   * به مالک کسب‌وکار خبر می‌دهد که برای کسب‌وکارش گزارش اصلاح اطلاعات ثبت شده.
   * سرویس پیامک هنوز کامل وصل نیست؛ این متد best-effort است و خطا را می‌بلعد
   * تا نبودِ تنظیمات پیامک، ثبت گزارش را با شکست مواجه نکند.
   */
  sendBusinessReportNotice(phone: string, businessTitle: string) {
    try {
      const sender = process.env.KAVENEGAR_SENDER || '10008663';
      const message = `یک گزارش اصلاح اطلاعات برای کسب‌وکار «${businessTitle}» ثبت شد. برای بررسی به پنل مراجعه کنید.`;
      this.kavenegar.Send({ message, sender, receptor: phone });
      console.log(
        `Sent business-report notice to ${phone} for "${businessTitle}"`,
      );
    } catch (e) {
      console.error('sendBusinessReportNotice failed', e);
    }
  }
}
