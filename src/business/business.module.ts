import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { BusinessImageService } from 'src/business-image/business-image.service';
import { UploadService } from 'src/upload/upload.service';
import { CategoriesService } from 'src/categories/categories.service';
import { CategoriesModule } from 'src/categories/categories.module';

@Module({
  controllers: [BusinessController],
  providers: [
    BusinessService,
    BusinessImageService,
    UploadService,
    CategoriesService,
  ],
  exports: [BusinessService],
  imports: [CategoriesModule],
})
export class BusinessModule {}
