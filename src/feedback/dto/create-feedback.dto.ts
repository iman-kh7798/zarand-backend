import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** ورودی فرم «پیشنهاد و بازخورد» — عمومی است و نیاز به لاگین ندارد */
export class CreateFeedbackDto {
  // نام فرستنده
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // راه ارتباطی (تلفن یا ایمیل) — اختیاری
  @IsString()
  @IsOptional()
  @MaxLength(150)
  contact?: string;

  // متن پیام
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
