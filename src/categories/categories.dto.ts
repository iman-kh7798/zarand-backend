import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddBusinessToCategoryDto {
  @IsUUID()
  businessId: string;

  @IsUUID()
  categoryId: string;
}

export class RemoveBusinessFromCategoryDto {
  @IsUUID()
  businessId: string;

  @IsUUID()
  categoryId: string;
}

export class UpdateProductCategoryDto {
  @IsUUID()
  categoryId: string;
}
