import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessModule } from './business/business.module';
import { CategoriesModule } from './categories/categories.module';
import { PrismaModule } from './prisma/prisma.module';
// import { ProductsModule } from './products/products.module';
import { UserModule } from './users/users.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { BusinessImageModule } from './business-image/business-image.module';
import { ProductImageModule } from './product-image/product-image.module';
import { SmsModule } from './sms/sms.module';
import { BusinessReviewModule } from './business-review/business-review.module';
import { FeedbackModule } from './feedback/feedback.module';
import { BusinessReportModule } from './business-report/business-report.module';
import { BlogModule } from './blog/blog.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';

@Module({
  imports: [
    // محدودیت نرخ درخواست (ضد اسپم / brute-force). سقف سراسری ملایم است تا
    // استفاده‌ی عادی API را محدود نکند؛ مسیرهای حساس (auth، فرم‌های عمومی)
    // با @Throttle در کنترلر خودشان سخت‌گیرانه‌تر تنظیم شده‌اند.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    BusinessModule,
    CategoriesModule,
    PrismaModule,
    // ProductsModule,
    UserModule,
    RoleModule,
    AuthModule,
    UploadModule,
    BusinessImageModule,
    ProductImageModule,
    SmsModule,
    BusinessReviewModule,
    FeedbackModule,
    BusinessReportModule,
    BlogModule,
    WinstonModule.forRoot(winstonConfig),
    // FavoriteBusinessModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // گارد throttler به‌صورت سراسری روی همه‌ی مسیرها اعمال می‌شود
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
