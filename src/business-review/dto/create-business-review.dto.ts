import { IsNumber, IsString } from 'class-validator';

export class CreateBusinessReviewDto {
  @IsNumber()
  rating: number; // 1-5

  @IsString()
  body?: string;
}
