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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import {
  FindBusinessQueryDto,
  UpdateBusinessDto,
  UpdateBusinessStatusDto,
} from './dto/update-business.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { BUSINESS_SCOPE, UploadService } from 'src/upload/upload.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OptionalAuthGuard } from 'src/auth/optional.guard';

@Controller('business')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly uploadService: UploadService,
  ) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Post()
  @UseInterceptors(FilesInterceptor('files', 10))
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateBusinessDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user.sub;
    if (files?.length > 10) {
      throw new BadRequestException('BUSINESS_IMAGE_LIMIT_EXCEEDED');
    }
    // کسب‌وکار همین حالا ساخته می‌شود، پس تاریخ امروز مبنای پوشه است
    const uploads = files?.length
      ? this.uploadService.createMany(files, {
          scope: BUSINESS_SCOPE,
          date: new Date(),
        })
      : [];
    return this.businessService.create(dto, userId, uploads);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Get()
  findAll(
    @Query() query: FindBusinessQueryDto,
    @Req() req: { user?: { role: Role; sub: string } },
  ) {
    const take = query.take ? +query.take : 10;
    const skip = query.skip ? +query.skip : 0;
    const cursor = query.lastId;

    return this.businessService.findBusinesses(
      {
        title: query.title,
        status: query.status,
        isActive: query.isActive,
        ownerName: query.ownerName,
        categoryId: query.categoryId,
        categoryName: query.categoryName,
      },
      take,
      skip,
      cursor,
      req.user,
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Get(':id')
  findOne(
    @Req() req: { user?: { role: Role; sub: string } },
    @Param('id') id: string,
  ) {
    const user = req?.user;
    return this.businessService.findOne(id, user);
  }

  @ApiBearerAuth('access-token')
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
      return this.businessService.adminUpdate(id, dto);
    }
    return this.businessService.update(id, dto, user.sub);
  }

  @ApiBearerAuth('access-token')
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

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateBusinessStatusDto) {
    return this.businessService.updateStatus(id, body);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Post(':id/upload-images')
  @UseInterceptors(FilesInterceptor('files', 10)) // 'files' = فیلد فرم، 10 = حداکثر تعداد
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5_000_000 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
    @Body() body: { altText?: string },
  ) {
    // قبل از نوشتن فایل روی دیسک وجود کسب‌وکار چک و تاریخ پوشه گرفته می‌شود
    const date = await this.businessService.getUploadDate(id);
    const uploadResults = this.uploadService.createMany(files, {
      scope: BUSINESS_SCOPE,
      date,
    });
    return this.businessService.addImages(id, uploadResults, body.altText);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Patch(':businessId/images/:imageId/set-main')
  setMainImage(
    @Req() req: { user: { sub: string; role: Role } },
    @Param('businessId') businessId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.businessService.setMainImage(businessId, imageId, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Delete(':businessId/image/:imageId')
  deleteImage(
    @Param('businessId') businessId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.businessService.deleteImage(businessId, imageId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Patch(':businessId/image/:imageId')
  @UseInterceptors(FileInterceptor('file'))
  async replaceImage(
    @Param('businessId') businessId: string,
    @Param('imageId') imageId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5_000_000 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: { altText?: string },
  ) {
    const date = await this.businessService.getUploadDate(businessId);
    const upload = this.uploadService.create(file, {
      scope: BUSINESS_SCOPE,
      date,
    });
    return this.businessService.replaceImage(
      businessId,
      imageId,
      upload,
      body.altText,
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Roles(Role.Owner)
  @Get('favorites/me')
  getFavorites(@Req() req: { user: { sub: string } }) {
    return this.businessService.getFavorites(req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Roles(Role.Owner)
  @Post(':id/favorite')
  addFavorite(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.businessService.addFavorite(id, req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Roles(Role.Owner)
  @Delete(':id/favorite')
  removeFavorite(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.businessService.removeFavorite(id, req.user.sub);
  }
}
