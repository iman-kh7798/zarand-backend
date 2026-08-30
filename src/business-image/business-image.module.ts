import { Module } from '@nestjs/common';
import { BusinessImageService } from './business-image.service';
import { BusinessImageController } from './business-image.controller';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  controllers: [BusinessImageController],
  providers: [BusinessImageService],
  imports: [UploadModule],
  exports: [BusinessImageService],
})
export class BusinessImageModule {}
