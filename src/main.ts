import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER, WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';
import { AllExceptionsFilter } from './exception-filter/exception-filter.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });
  // پشت پروکسی cPanel اجرا می‌شود؛ برای گرفتن IP واقعی کلاینت (throttler)
  app.set('trust proxy', 1);
  const config = new DocumentBuilder()
    .setTitle('Zarand Backend')
    .setDescription('Zarand api description')
    .setVersion('1.0')
    .addTag('zarand')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token', // این اسم یه key دلخواهه، بعداً استفاده میشه
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true, // بعد از رفرش صفحه توکن نپره (پیشنهادی)
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(WINSTON_MODULE_PROVIDER)),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
