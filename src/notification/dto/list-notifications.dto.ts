import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

/** فیلترهای صندوق اعلان کاربر */
export class ListMyNotificationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  take?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lastId?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  isRead?: string;
}

/** فیلترهای لیست مدیریتی اعلان‌ها */
export class ListNotificationsDto extends ListMyNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ description: 'جست‌وجو در عنوان و متن' })
  @IsOptional()
  @IsString()
  search?: string;
}
