import {
  IsString,
  Matches,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

export class SignInDto {
  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
export class SignUpDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  // کد تایید پیامکی که قبلاً با auth/send-phone فرستاده شده
  @IsNotEmpty()
  @IsString()
  code: string;
}
export class SendPhoneDto {
  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;
}

export class VerifyCodeDto {
  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsNotEmpty()
  @IsString()
  code: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  // کد تایید پیامکی که قبلاً با auth/send-phone فرستاده شده
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class SendCodeDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;
}
