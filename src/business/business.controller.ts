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
import {
  CreateBusinessByUserDto,
  CreateBusinessDto,
} from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { BusinessOwnerGuard } from './guards/business-owner.guard';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @Post('by-owner')
  // create(@Body() dto: CreateBusinessDto) {
  //   return this.businessService.create(dto);
  // }
  @Get()
  findApproved() {
    return this.businessService.findApproved();
  }

  @Get(':id')
  findApprovedOne(@Param('id') id: string) {
    return this.businessService.findApprovedOne(id);
  }

  @Get()
  findAllAdmin() {
    return this.businessService.findAllAdmin();
  }

  @Get(':id')
  findOneAdmin(@Param('id') id: string) {
    return this.businessService.findOneAdmin(id);
  }

  @UseGuards(AuthGuard)
  @Post()
  createByUser(@Body() dto: CreateBusinessByUserDto, @Req() req: Request) {
    // ownerId must come from token (req.user), not from dto
    // @ts-expect-error - req.user is attached by AuthGuard
    return this.businessService.createByUser(dto, req.user.id);
  }

  // ✅ Owner of business OR Admin: update business
  @UseGuards(AuthGuard, BusinessOwnerGuard)
  @Patch(':id')
  updateByOwner(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.updateByOwner(id, dto);
  }

  // ✅ Owner of business OR Admin: delete business (اختیاری)
  @UseGuards(AuthGuard, BusinessOwnerGuard)
  @Delete(':id')
  removeByOwner(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
  // @UseGuards(AuthGuard)
  // @Post()
  // createBusinessByUser(
  //   @Body() dto: CreateBusinessByUserDto,
  //   @Req() req: Request,
  // ) {
  //   return this.businessService.createBussinessByUser(dto, req.user);
  // }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @Get()
  // findAll() {
  //   return this.businessService.findAll();
  // }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.businessService.findOne(id);
  // }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.businessService.approve(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
}
