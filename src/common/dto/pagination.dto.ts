import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class PaginationDto {
  @IsNumberString()
  take: number;

  @IsNumberString()
  skip: number;

  @IsUUID()
  @IsOptional()
  lastId?: string;
}
