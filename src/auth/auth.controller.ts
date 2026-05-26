import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import {
  SendPhoneDto,
  SignInDto,
  SignUpDto,
  VerifyCodeDto,
} from './dto/auth.dto';
import { UserService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.phone, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(
      signUpDto.name,
      signUpDto.phone,
      signUpDto.password,
    );
  }

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

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req: { user: { sub: string } }) {
    const user = await this.userService.findOne(req.user.sub);
    return user;
  }
}
