export class CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

export class UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export class AddBusinessToCategoryDto {
  businessId: string;
  categoryId: string;
}

export class RemoveBusinessFromCategoryDto {
  businessId: string;
  categoryId: string;
}

export class UpdateProductCategoryDto {
  categoryId: string;
}
