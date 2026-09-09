import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  ResetPasswordDto,
  SendPhoneDto,
  SignInDto,
  SignUpDto,
  VerifyCodeDto,
} from './dto/auth.dto';

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

  // ثبت‌نام با شماره موبایل + پسورد + کد تایید
  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('register')
  register(@Body() signUp: SignUpDto) {
    return this.authService.register(signUp);
  }

  // ورود با شماره موبایل + پسورد — سقف برای جلوگیری از brute-force
  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() signIn: SignInDto) {
    return this.authService.login(signIn.phone, signIn.password);
  }

  // فراموشی پسورد: کد تایید همون auth/send-phone رو می‌گیره + پسورد جدید رو ست می‌کنه
  @Throttle({ default: { ttl: 600_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() resetPassword: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPassword.phone,
      resetPassword.code,
      resetPassword.newPassword,
    );
  }
}
