import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateProfileDto {
  @IsString()
  name?: string | null;

  //   @Matches(/^(\+98|0098|0)?9\d{9}$/, {
  //     message: 'phone is not valid',
  //   })
  //   phone: string;
}
