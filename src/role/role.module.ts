import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RolesGuard } from './role.guard';

@Module({
  controllers: [RoleController],
  providers: [RoleService, RolesGuard],
  exports: [RoleService], // اگر جای دیگر لازم داری
})
export class RoleModule {}
