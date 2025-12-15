import { IsString, Matches } from 'class-validator';

export class SignInDto {
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

  @Matches(/^(\+98|0098|0)?9\d{9}$/, {
    message: 'phone is not valid',
  })
  phone: string;

  @IsString()
  password: string;
}
