import { Module } from '@nestjs/common';
import { BusinessImageService } from './business-image.service';
import { BusinessImageController } from './business-image.controller';

@Module({
  controllers: [BusinessImageController],
  providers: [BusinessImageService],
})
export class BusinessImageModule {}
