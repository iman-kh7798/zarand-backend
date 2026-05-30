import { Module } from '@nestjs/common';
import { BusinessCatController } from './business-cat.controller';
import { BusinessCatService } from './business-cat.service';

@Module({
  providers: [BusinessCatService],
  controllers: [BusinessCatController],
})
export class CategoriesModule {}
