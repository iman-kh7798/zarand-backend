import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  price: string; // یا number، ولی برای Decimal بهتره string

  @IsString()
  businessId: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
