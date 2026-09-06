import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateBlogCategoryDto {
  @ApiProperty({ maxLength: 255, example: 'راهنمای شهر' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    maxLength: 255,
    pattern: '^[a-z0-9-]+$',
    description: 'فقط حروف کوچک لاتین، رقم و خط تیره',
    example: 'city-guide',
  })
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9-]+$/, { message: 'INVALID_SLUG' })
  slug: string;
}
