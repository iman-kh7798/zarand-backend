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

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createCategory: CreateCategory) {
    this.categoriesService.create(createCategory);
  }

  @UseGuards(AuthGuard)
  @Patch()
  update() {}

  @UseGuards(AuthGuard)
  @Delete()
  delete() {}
}
