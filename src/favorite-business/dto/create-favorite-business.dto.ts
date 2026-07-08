import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFavoriteBusinessDto {
  @IsString()
  @IsNotEmpty()
  businessId: string;
}
