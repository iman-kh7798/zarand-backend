import { IsOptional, IsString } from 'class-validator';

export class CreateProductImageDto {
  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  url: string;

  @IsString()
  productId: string;
}
