import { ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * پارامترهای query برای `GET /blog/admin` (لیست مدیریتی مقالات).
 * برخلاف لیست عمومی، همه‌ی وضعیت‌ها (DRAFT و PUBLISHED) را برمی‌گرداند.
 */
export class QueryBlogAdminPostsDto {
  @ApiPropertyOptional({ description: 'جست‌وجوی متنی روی عنوان یا خلاصه' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: BlogPostStatus,
    description: 'فیلتر وضعیت؛ اگر فرستاده نشود همه‌ی وضعیت‌ها برمی‌گردد',
  })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'فیلتر بر اساس شناسه‌ی دسته‌بندی',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number = 10;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;
}
