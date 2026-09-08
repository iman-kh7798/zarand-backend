import { BlogPostStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * اعتبارسنجی‌های سخت‌گیرانه‌ی محتوا فقط برای مقاله‌ی PUBLISHED اجرا می‌شوند.
 * برای پیش‌نویس (status === DRAFT یا نبودِ status) فقط `title` اجباری است.
 */
const isPublished = (o: { status?: BlogPostStatus }) =>
  o.status === BlogPostStatus.PUBLISHED;

export class CreateBlogPostDto {
  @ApiProperty({
    minLength: 5,
    maxLength: 150,
    example: 'راهنمای کامل بازدید از زرند',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  title: string;

  @ApiProperty({
    minLength: 20,
    maxLength: 300,
    description: 'خلاصه‌ی کوتاه که در لیست مقالات نمایش داده می‌شود',
  })
  @ValidateIf(isPublished)
  @IsString()
  @MinLength(20)
  @MaxLength(300)
  excerpt: string;

  @ApiProperty({
    minLength: 50,
    description: 'متن مقاله به‌صورت HTML خام؛ سمت سرور sanitize می‌شود',
  })
  @ValidateIf(isPublished)
  @IsString()
  @MinLength(50)
  content: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description:
      'اسلاگ دلخواه. اگر فرستاده نشود از روی `title` ساخته می‌شود و در صورت ' +
      'تکراری‌بودن عدد به آن اضافه می‌شود.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'شناسه‌ی یک `BlogCategory` موجود',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ maxLength: 120, example: 'تحریریه' })
  @ValidateIf(isPublished)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  authorName: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'سردبیر' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorRole?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'مسیر تصویر کاور — معمولاً خروجی `POST /blog/upload-cover`',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({ maxLength: 500, description: 'مسیر تصویر نویسنده' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  authorAvatar?: string;

  @ApiPropertyOptional({
    minimum: 1,
    description:
      'زمان مطالعه بر حسب دقیقه؛ اگر ندهید از طول متن تخمین زده می‌شود',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readTimeMinutes?: number;

  @ApiPropertyOptional({
    enum: BlogPostStatus,
    default: BlogPostStatus.DRAFT,
    description: 'با PUBLISHED مقدار `publishedAt` همان لحظه ست می‌شود',
  })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;
}
