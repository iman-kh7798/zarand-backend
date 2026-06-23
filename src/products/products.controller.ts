// src/products/products.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { UploadService } from 'src/upload/upload.service';
// @UseGuards(RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly uploadService: UploadService,
  ) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(@Query('businessId') businessId?: string) {
    if (businessId) {
      return this.productsService.findAllByBusiness(businessId);
    }
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5000000 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: { altText?: string },
  ) {
    const { path } = this.uploadService.create(file);
    return this.productsService.addImage(id, path, body.altText);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Delete(':productId/image/:imageId')
  deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteImage(productId, imageId);
  }
}
