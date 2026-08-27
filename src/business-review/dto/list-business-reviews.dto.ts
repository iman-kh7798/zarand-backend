import {
  IsBooleanString,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** پارامترهای لیست نظرها در پنل مدیریت (owner و admin) */
export class ListBusinessReviewsDto {
  @IsNumberString()
  @IsOptional()
  take?: number;

  @IsNumberString()
  @IsOptional()
  skip?: number;

  @IsUUID()
  @IsOptional()
  lastId?: string;

  /** فیلتر روی یک کسب‌وکار مشخص */
  @IsUUID()
  @IsOptional()
  businessId?: string;

  /** جست‌وجو روی عنوان کسب‌وکار */
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  /** 'true' فقط تاییدشده‌ها، 'false' فقط در انتظار تایید، خالی یعنی همه */
  @IsBooleanString()
  @IsOptional()
  isApproved?: string;
}
