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

@UseGuards(AuthGuard, RolesGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Roles(Role.Owner)
  @Post()
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateBusinessDto,
  ) {
    const userId = req.user.sub;
    return this.businessService.create(dto, userId);
  }

  @Roles(Role.Admin, Role.Owner)
  @Get()
  findAll(@Req() req: { user: { role: Role; sub: string } }) {
    const user = req.user;
    if (user.role === Role.Admin) {
      return this.businessService.findAll();
    }
    return this.businessService.findPerBusiness(user.sub);
  }

  @Roles(Role.Owner)
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

  @Roles(Role.Owner)
  @Patch(':id')
  update(
    @Req() req: { user: { role: Role; sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    const user = req.user;
    // if (user.role === Role.Admin) {
    //   return this.businessService.update(id, dto);
    // }
    return this.businessService.update(id, dto, user.sub);
  }

  @Roles(Role.Owner)
  @Delete(':id')
  remove(
    @Req() req: { user: { role: Role; sub: string } },
    @Param('id') id: string,
  ) {
    const user = req.user;
    // if (user.role === Role.Admin) {
    //   return this.businessService.remove(id);
    // }
    return this.businessService.removeByOwner(id, user.sub);
  }

  @Roles(Role.Admin)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateBusinessStatusDto) {
    return this.businessService.updateStatus(id, body);
  }
}
