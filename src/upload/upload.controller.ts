import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { RolesGuard } from 'src/role/role.guard';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // @Roles(Role.Admin, Role.Owner)
  // @Post()
  // @UseInterceptors(FileInterceptor('file'))
  // createFile(
  //   @UploadedFile(
  //     new ParseFilePipe({
  //       validators: [
  //         new MaxFileSizeValidator({ maxSize: 5_000_000 }),
  //         new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/ }),
  //       ],
  //     }),
  //   )
  //   file: Express.Multer.File,
  //   // @Body() body: UploadFileDto,
  // ) {
  //   return this.uploadService.create(file);
  // }

  // @Roles(Role.Admin, Role.Owner)
  // @Patch()
  // updateFile() {}

  // @Roles(Role.Admin, Role.Owner)
  // @Delete()
  // deleteFile() {}
}
