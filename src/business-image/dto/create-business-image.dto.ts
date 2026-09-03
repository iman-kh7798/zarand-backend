import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateBusinessImageDto {
  @IsString()
  @IsOptional()
  altText?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  url: string;

  @IsString()
  businessId: string;
}
