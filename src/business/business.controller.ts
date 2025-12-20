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
  @Roles(Role.Owner, Role.Admin)
  @Post()
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateBusinessDto,
  ) {
    const userId = req.user.sub;
    return this.businessService.create(dto, userId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Get()
  findAll(@Req() req: { user: { role: Role; sub: string } }) {
    const user = req.user;
    if (user.role === Role.Admin) {
      return this.businessService.findAll();
    }
    return this.businessService.findPerBusiness(user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Get(':id')
  findOne(
    @Req() req: { user: { role: Role; sub: string } },
    @Param('id') id: string,
  ) {
    const user = req.user;
    if (user.role === Role.Admin) {
      return this.businessService.findOne(id);
    }
    return this.businessService.findOnePerOwner(id, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Patch(':id')
  update(
    @Req() req: { user: { role: Role; sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    const user = req.user;
    if (user.role === Role.Admin) {
      return this.businessService.update(id, dto);
    }
    return this.businessService.updateByOwner(id, dto, user.sub);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateBusinessStatusDto) {
    return this.businessService.updateStatus(id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Delete(':id')
  remove(
    @Req() req: { user: { role: Role; sub: string } },
    @Param('id') id: string,
  ) {
    const user = req.user;
    if (user.role === Role.Admin) {
      return this.businessService.remove(id);
    }
    return this.businessService.removeByOwner(id, user.sub);
  }
}
