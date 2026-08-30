import { IsOptional, IsString } from 'class-validator';

export class CreateBusinessImageDto {
  @IsString()
  @IsOptional()
  altText?: string;

  @IsString()
  url: string;

  @IsString()
  businessId: string;
}
