import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessDto } from './create-business.dto';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}

/**
 * فیلترهای لیست کسب‌وکارها.
 * ⚠️ فیلترهای `status` و `isActive` فقط برای ADMIN اعمال می‌شوند؛
 * برای بقیه در سرویس نادیده گرفته می‌شوند.
 */
export class FindBusinessQueryDto extends PartialType(PaginationDto) {
  @ApiPropertyOptional({ description: 'جست‌وجوی جزئی روی عنوان کسب‌وکار' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: BusinessStatus, description: 'فقط ADMIN' })
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @ApiPropertyOptional({ type: Boolean, description: 'فقط ADMIN' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'جست‌وجوی جزئی روی نام مالک' })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی دسته‌بندی' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'جست‌وجوی جزئی روی نام دسته‌بندی' })
  @IsOptional()
  @IsString()
  categoryName?: string;
}

/** @deprecated از FindBusinessQueryDto استفاده کن */
export class FindByStatusQueryDto extends FindBusinessQueryDto {}

export class UpdateBusinessStatusDto {
  @ApiProperty({ enum: [BusinessStatus.APPROVED, BusinessStatus.REJECTED] })
  @IsIn([BusinessStatus.APPROVED, BusinessStatus.REJECTED])
  status: typeof BusinessStatus.APPROVED | typeof BusinessStatus.REJECTED;
}
