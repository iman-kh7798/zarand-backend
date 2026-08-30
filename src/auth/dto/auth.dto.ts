import { IsString, Matches, IsNotEmpty } from 'class-validator';

export class SignInDto {
  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsString()
  password: string;
}
export class SignUpDto {
  @IsString()
  name: string;

  @IsNotEmpty()
  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsString()
  password: string;
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
