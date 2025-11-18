export class CreateBusinessDto {
  title: string;
  slug: string;
  description?: string;
  address?: any;
  phone?: string;
  website?: string;
  ownerId: string; // از User
}
