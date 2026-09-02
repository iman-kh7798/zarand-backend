import { BusinessReviewStatus } from '@prisma/client';
import {
  IsEnum,
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

  /** فیلتر وضعیت: PENDING / APPROVED / REJECTED؛ خالی یعنی همه */
  @IsEnum(BusinessReviewStatus)
  @IsOptional()
  status?: BusinessReviewStatus;
}
