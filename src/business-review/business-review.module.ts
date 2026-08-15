import { Module } from '@nestjs/common';
import { BusinessReviewService } from './business-review.service';
import { BusinessReviewController } from './business-review.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessReviewController],
  providers: [BusinessReviewService],
  exports: [BusinessReviewService],
})
export class BusinessReviewModule {}
