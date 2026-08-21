import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessDto } from './create-business.dto';
import {
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}
export class FindByStatusQueryDto extends PartialType(PaginationDto) {
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;
}

export class UpdateBusinessStatusDto {
  @ApiProperty({ enum: [BusinessStatus.APPROVED, BusinessStatus.REJECTED] })
  @IsIn([BusinessStatus.APPROVED, BusinessStatus.REJECTED])
  status: typeof BusinessStatus.APPROVED | typeof BusinessStatus.REJECTED;
}
