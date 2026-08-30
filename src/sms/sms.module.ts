import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService], // برای استفاده در auth
})
export class SmsModule {}
