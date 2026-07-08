import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { RolesGuard } from 'src/role/role.guard';
import { CreateFavoriteBusinessDto } from './dto/create-favorite-business.dto';
import { FavoriteBusinessService } from './favorite-business.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.User, Role.Owner, Role.Admin)
@Controller('favorite-businesses')
export class FavoriteBusinessController {
  constructor(
    private readonly favoriteBusinessService: FavoriteBusinessService,
  ) {}

  @Post()
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateFavoriteBusinessDto,
  ) {
    return this.favoriteBusinessService.create(req.user.sub, dto.businessId);
  }

  @Get()
  findAll(@Req() req: { user: { sub: string } }) {
    return this.favoriteBusinessService.findAll(req.user.sub);
  }

  @Get(':businessId')
  findOne(
    @Req() req: { user: { sub: string } },
    @Param('businessId') businessId: string,
  ) {
    return this.favoriteBusinessService.findOne(req.user.sub, businessId);
  }

  @Delete(':businessId')
  remove(
    @Req() req: { user: { sub: string } },
    @Param('businessId') businessId: string,
  ) {
    return this.favoriteBusinessService.remove(req.user.sub, businessId);
  }
}
