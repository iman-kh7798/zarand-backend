import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateBusinessReviewDto {
  // اگر مقدار داشته باشد، این نظر یک «پاسخ» به نظر دیگری است (فقط یک سطح مجاز است).
  @IsUUID()
  @IsOptional()
  parentId?: string;

  // نظر ریشه حتماً امتیاز دارد؛ روی «پاسخ» نباید امتیاز فرستاده شود.
  @ValidateIf((o: CreateBusinessReviewDto) => !o.parentId)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  body?: string;
}
