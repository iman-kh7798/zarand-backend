import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UserController } from './users.controller';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // برای استفاده در auth
})
export class UserModule {}
