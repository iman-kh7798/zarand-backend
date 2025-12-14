import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { BusinessService } from 'src/business/business.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, BusinessService],
})
export class ProductsModule {}
