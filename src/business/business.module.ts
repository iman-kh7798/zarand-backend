import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { BusinessImageService } from 'src/business-image/business-image.service';
import { CategoriesService } from 'src/categories/categories.service';
import { CategoriesModule } from 'src/categories/categories.module';
import { UploadModule } from 'src/upload/upload.module';
import { FavoriteBusinessService } from 'src/favorite-business/favorite-business.service';

@Module({
  controllers: [BusinessController],
  providers: [
    BusinessService,
    BusinessImageService,
    CategoriesService,
    FavoriteBusinessService,
  ],
  exports: [BusinessService],
  imports: [CategoriesModule, UploadModule],
})
export class BusinessModule {}
