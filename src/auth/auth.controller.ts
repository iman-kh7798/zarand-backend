import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendPhoneDto, VerifyCodeDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // هر درخواست یک پیامک هزینه دارد → سقف سخت: ۵ بار در ۱۰ دقیقه به‌ازای هر IP
  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('send-phone')
  sendPhone(@Body() sendPhone: SendPhoneDto) {
    return this.authService.sendPhone(sendPhone.phone);
  }

  // جلوگیری از brute-force کد تایید: ۱۰ بار در ۱۰ دقیقه به‌ازای هر IP
  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-code')
  verifyCode(@Body() verifyCode: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCode.phone, verifyCode.code);
  }
}
