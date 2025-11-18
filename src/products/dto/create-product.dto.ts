export class CreateProductDto {
  title: string;
  description?: string;
  shortDescription?: string;
  price: string; // یا number، ولی برای Decimal بهتره string
  businessId: string;
  categoryId?: string;
}
