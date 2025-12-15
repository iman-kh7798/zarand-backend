import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import {
  UpdateBusinessDto,
  UpdateBusinessStatusDto,
} from './dto/update-business.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Business)
  @Get('by-owner')
  findByOwnerId(@Req() req: { user: { sub: string } }) {
    return this.businessService.findByOwnerId(req.user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Business, Role.Admin)
  @Post()
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateBusinessDto,
  ) {
    const userId = req.user.sub;
    return this.businessService.create(dto, userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  findAll() {
    return this.businessService.findAll();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateBusinessStatusDto) {
    return this.businessService.updateStatus(id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
}
