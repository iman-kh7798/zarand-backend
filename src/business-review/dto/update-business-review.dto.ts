import { IsNumber, IsString } from 'class-validator';

export class UpdateBusinessReviewDto {
  @IsNumber()
  rating: number; // 1-5

  @IsString()
  body?: string;
}
