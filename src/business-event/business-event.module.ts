import { Module } from '@nestjs/common';
import { BusinessEventService } from './business-event.service';
import { BusinessEventController } from './business-event.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessEventController],
  providers: [BusinessEventService],
  exports: [BusinessEventService],
})
export class BusinessEventModule {}
