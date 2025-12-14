import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';

import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/business')
export class AdminBusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  findAllAdmin() {
    return this.businessService.findAllAdmin();
  }

  @Get(':id')
  findOneAdmin(@Param('id') id: string) {
    return this.businessService.findOneAdmin(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.businessService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.businessService.reject(id);
  }
}
