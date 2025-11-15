import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessModule } from './business/business.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [BusinessModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
