import { PartialType } from '@nestjs/swagger';
import { CreateBusinessImageDto } from './create-business-image.dto';
import { IsString } from 'class-validator';

export class UpdateBusinessImageDto extends PartialType(
  CreateBusinessImageDto,
) {
  @IsString()
  id: string;
}
