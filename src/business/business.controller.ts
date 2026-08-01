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
  Sse,
  RequestMethod,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import { UploadService } from 'src/upload/upload.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { NotFoundError } from 'rxjs';

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
    if (files.length > 10) {
      throw new BadRequestException('BUSINESS_IMAGE_LIMIT_EXCEEDED');
    }
    const uploads = files?.length ? this.uploadService.createMany(files) : [];
    return this.businessService.create(dto, userId, uploads);
  }
  @Get()
  findAll(@Req() req: { user?: { role: Role; sub: string } }) {
    const user = req.user;

    if (user && user.role === Role.Owner) {
      return this.businessService.findPerBusiness(user.sub);
    }
    return this.businessService.findAll();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Get('by-owner')
  findAllByOwner(@Req() req: { user?: { role: Role; sub: string } }) {
    const user = req.user;
    if (user) {
      return this.businessService.findPerBusiness(user.sub);
    } else {
      throw new NotFoundError('OWNER_NOT_FOUND');
    }
  }
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
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
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
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
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
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
    const uploadResults = this.uploadService.createMany(files);
    return this.businessService.addImages(id, uploadResults, body.altText);
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
  replaceImage(
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
    const upload = this.uploadService.create(file);
    return this.businessService.replaceImage(
      businessId,
      imageId,
      upload,
      body.altText,
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Roles(Role.Owner, Role.User)
  @Get('favorites/me')
  getFavorites(@Req() req: { user: { sub: string } }) {
    return this.businessService.getFavorites(req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Roles(Role.Owner, Role.User)
  @Post(':id/favorite')
  addFavorite(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.businessService.addFavorite(id, req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Roles(Role.Owner, Role.User)
  @Delete(':id/favorite')
  removeFavorite(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.businessService.removeFavorite(id, req.user.sub);
  }
}
