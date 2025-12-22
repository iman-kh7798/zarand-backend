import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { BusinessImageService } from 'src/business-image/business-image.service';

@Module({
  controllers: [BusinessController],
  providers: [BusinessService, BusinessImageService],
  exports: [BusinessService],
})
export class BusinessModule {}
