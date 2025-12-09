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
import { CreateCategory } from './categories.dto';
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Business)
  @Post()
  create(@Body() createCategory: CreateCategory) {
    this.categoriesService.create(createCategory);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Business)
  @Patch()
  update() {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Business)
  @Delete()
  delete() {}
}
