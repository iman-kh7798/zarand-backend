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
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import {
  AddBusinessToCategoryDto,
  RemoveBusinessFromCategoryDto,
} from './categories.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get(':id/businesses')
  getBusinessesByCategory(@Param('id') id: string) {
    return this.categoriesService.getBusinessesByCategory(id);
  }

  // @Get(':id/products')
  // getProductsByCategory(@Param('id') id: string) {
  //   return this.categoriesService.getProductsByCategory(id);
  // }
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Post('business/add')
  addBusinessToCategory(@Body() dto: AddBusinessToCategoryDto) {
    return this.categoriesService.addBusinessToCategory(dto);
  }
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Post('business/remove')
  removeBusinessFromCategory(@Body() dto: RemoveBusinessFromCategoryDto) {
    return this.categoriesService.removeBusinessFromCategory(dto);
  }

  @Get('business/:businessId')
  getCategoriesByBusiness(@Param('businessId') businessId: string) {
    return this.categoriesService.getCategoriesByBusiness(businessId);
  }

  // Product-Category Management
  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.Owner)
  // @Patch('product/:productId')
  // updateProductCategory(
  //   @Param('productId') productId: string,
  //   @Body() dto: UpdateProductCategoryDto,
  // ) {
  //   return this.categoriesService.updateProductCategory(
  //     productId,
  //     dto.categoryId,
  //   );
  // }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(Role.Owner)
  // @Delete('product/:productId')
  // removeProductCategory(@Param('productId') productId: string) {
  //   return this.categoriesService.removeProductCategory(productId);
  // }
}
