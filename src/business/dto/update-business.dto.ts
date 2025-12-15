import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessDto } from './create-business.dto';
import { IsEnum } from 'class-validator';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}

export class UpdateBusinessStatusDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';
}
