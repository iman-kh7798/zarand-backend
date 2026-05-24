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
import { SendCodeDto, SignInDto, SignUpDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  @Post('send-code')
  sendCode(@Body() sendCode: SendCodeDto) {
    return this.authService.sendCode({
      type: sendCode.type,
      phone: sendCode.phone,
      code: sendCode.code,
    });
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: { user: object }) {
    return req.user;
  }
}
