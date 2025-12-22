import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { BusinessService } from 'src/business/business.service';
import { BusinessImageService } from 'src/business-image/business-image.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, BusinessService, BusinessImageService],
})
export class ProductsModule {}
