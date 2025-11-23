/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId: string;
}
export class CreateBusinessByUserDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
