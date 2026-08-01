import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendPhoneDto, VerifyCodeDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('send-phone')
  sendPhone(@Body() sendPhone: SendPhoneDto) {
    return this.authService.sendPhone(sendPhone.phone);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-code')
  verifyCode(@Body() verifyCode: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCode.phone, verifyCode.code);
  }
}
