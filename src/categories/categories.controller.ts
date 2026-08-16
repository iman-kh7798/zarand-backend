import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import {
  SetBusinessCategoryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  FindBySlubDto,
} from './categories.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from 'src/upload/upload.service';
import { OptionalAuthGuard } from 'src/auth/optional.guard';

@Controller('categories')
export class CategoriesController {
  constructor(
    private categoriesService: CategoriesService,
    private uploadService: UploadService,
  ) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('slug/:slug')
  findBySlub(@Param('slug') slug: string) {
    return this.categoriesService.findOneBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Get(':id/businesses')
  getBusinessesByCategory(
    @Param('id') id: string,
    @Req() req: { user?: { role: Role; sub: string } },
  ) {
    const user = req.user;
    if (!user) {
      return this.categoriesService.getActiveBusinessesByCategory(id);
    }
    if (user.role === Role.Admin) {
      return this.categoriesService.getBusinessesByCategory(id);
    }
    throw new ForbiddenException();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post()
  @UseInterceptors(FileInterceptor('coverImage'))
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5_000_000 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/ }),
        ],
      }),
    )
    coverImage: Express.Multer.File,
  ) {
    const upload = this.uploadService.create(coverImage);
    return this.categoriesService.create(createCategoryDto, upload.path);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('coverImage'))
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    const upload = coverImage
      ? this.uploadService.create(coverImage)
      : undefined;
    return this.categoriesService.update(id, updateCategoryDto, upload?.path);
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
  @Post('business/set')
  setBusinessCategory(@Body() dto: SetBusinessCategoryDto) {
    return this.categoriesService.setBusinessCategory(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Delete('business/:businessId')
  removeBusinessCategory(@Param('businessId') businessId: string) {
    return this.categoriesService.removeBusinessCategory(businessId);
  }

  @Get('business/:businessId')
  getCategoryByBusiness(@Param('businessId') businessId: string) {
    return this.categoriesService.getCategoryByBusiness(businessId);
  }
}
