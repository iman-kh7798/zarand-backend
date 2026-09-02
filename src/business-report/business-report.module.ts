import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BusinessReportService } from './business-report.service';
import { BusinessReportController } from './business-report.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessReportController],
  providers: [BusinessReportService],
  exports: [BusinessReportService],
})
export class BusinessReportModule {}
