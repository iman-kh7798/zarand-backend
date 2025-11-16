export class CreateProductDto {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: string; // یا number، ولی برای Decimal بهتره string
  currency?: string;
  businessId: string;
  categoryId?: string;
}
