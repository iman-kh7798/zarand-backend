import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessModule } from './business/business.module';
import { CategoriesModule } from './categories/categories.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UserModule } from './users/users.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { BusinessImageModule } from './business-image/business-image.module';
import { ProductImageModule } from './product-image/product-image.module';

@Module({
  imports: [
    BusinessModule,
    CategoriesModule,
    PrismaModule,
    ProductsModule,
    UserModule,
    RoleModule,
    AuthModule,
    UploadModule,
    BusinessImageModule,
    ProductImageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
