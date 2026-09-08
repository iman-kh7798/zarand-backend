import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** پارامترهای query برای `GET /blog` (لیست عمومی مقالات) */
export class QueryBlogPostsDto {
  @ApiPropertyOptional({ description: 'فیلتر بر اساس slug دسته‌بندی' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'جست‌وجوی متنی روی عنوان یا خلاصه' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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
