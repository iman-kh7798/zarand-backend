import { PartialType } from '@nestjs/swagger';
import { CreateProductImageDto } from './create-product-image.dto';
import { IsString } from 'class-validator';

export class UpdateProductImageDto extends PartialType(CreateProductImageDto) {
  @IsString()
  id: string;
}
