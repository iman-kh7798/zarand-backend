import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';

@Module({
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService], // اگر جای دیگر لازم داری
})
export class RoleModule {}
