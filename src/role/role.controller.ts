import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from './role.guard';
import { Roles } from './role.decorator';
import { Role } from './role.enum';
@UseGuards(AuthGuard, RolesGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }
}
