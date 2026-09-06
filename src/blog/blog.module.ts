import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogCategoryService } from './blog-category.service';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [BlogController],
  providers: [BlogService, BlogCategoryService],
  exports: [BlogService, BlogCategoryService],
})
export class BlogModule {}
