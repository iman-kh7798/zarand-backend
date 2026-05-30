import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateCategory } from './business-cat.dto';
import { BusinessCatService } from './business-cat.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';

@Controller('business-cat')
export class BusinessCatController {
  constructor(private businessCatService: BusinessCatService) {}

  @Get()
  findAll() {
    return this.businessCatService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Post()
  create(@Body() createCategory: CreateCategory) {
    this.businessCatService.create(createCategory);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Patch()
  update() {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Delete()
  delete() {}
}
