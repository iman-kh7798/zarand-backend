# مستند پروژه (Zarand Backend)

بک‌اند یک دایرکتوری/مارکت‌پلیس محلی، نوشته‌شده با **NestJS 11** و **Prisma 7** روی **MySQL/MariaDB**. احراز هویت با کد یک‌بارمصرف پیامکی (Kavenegar) و JWT انجام می‌شود.

> اگر با Claude Code روی این پروژه کار می‌کنید، `CLAUDE.md` جزئیات کانونشن‌های کدنویسی را دارد.

## تکنولوژی‌ها

- Node.js 22 + TypeScript
- NestJS 11 (Express)
- Prisma 7 با driver adapter `@prisma/adapter-mariadb`
- JWT (`@nestjs/jwt`) + گاردهای دستی
- Winston + daily-rotate-file برای لاگ
- Swagger برای مستندات API
- Jest برای تست

## پیش‌نیازها

- Node.js >= 20 (روی CI نسخه‌ی ۲۲ استفاده می‌شود)
- npm
- یک دیتابیس MySQL/MariaDB در دسترس

## راه‌اندازی

```bash
npm install
cp env.example .env        # سپس مقادیر را پر کنید
npm run generate           # prisma generate
npm run deploy             # prisma migrate deploy  (یا: npm run push)
npm run seed               # ساخت نقش‌ها و کاربر ادمین اولیه
npm run start:dev
```

پس از اجرا:

- API روی `http://localhost:3000`
- مستندات Swagger روی `http://localhost:3000/api`
- فایل‌های آپلودشده روی `http://localhost:3000/uploads/...`

## متغیرهای محیطی

| متغیر | توضیح |
|---|---|
| `DATABASE_URL` | فقط برای Prisma CLI (migrate / db push / studio) |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | اتصال زمان اجرا از طریق `PrismaService` |
| `JWT_SECRET` | **اجباری** — بدون آن اپ بالا نمی‌آید |
| `JWT_EXPIRES_IN` | پیش‌فرض `3600s` |
| `KAVENEGAR_API_KEY` / `KAVENEGAR_SENDER` | ارسال پیامک |
| `PORT` | پیش‌فرض `3000` |

نمونه‌ی کامل در `env.example`. فایل `.env` هرگز نباید commit شود.

## اسکریپت‌ها

| دستور | کار |
|---|---|
| `npm run start:dev` | اجرا با watch |
| `npm run build` | بیلد به `dist/` |
| `npm run start:prod` | اجرای `dist/src/main` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | تست‌های Jest |
| `npm run generate` | `prisma generate` |
| `npm run push` | `prisma db push` |
| `npm run deploy` | `prisma migrate deploy` |
| `npm run seed` | seed کردن نقش‌ها و ادمین |

## ساختار پروژه

```
src/
  main.ts                bootstrap (Swagger، ValidationPipe سراسری، exception filter)
  app.module.ts          رجیستر ماژول‌ها
  auth/                  OTP + JWT، AuthGuard، OptionalAuthGuard
  role/                  enum نقش‌ها، دکوریتور @Roles، RolesGuard
  users/                 کاربران و کدهای OTP
  business/              کسب‌وکارها (هسته‌ی پروژه)
  business-image/        تصاویر کسب‌وکار
  business-review/       امتیاز و نظر کسب‌وکار
  categories/            دسته‌بندی درختی
  favorite-business/     علاقه‌مندی‌ها
  products/, product-image/   محصولات (هنوز در app.module فعال نشده)
  upload/                ذخیره‌ی فایل روی دیسک
  sms/                   Kavenegar
  prisma/                PrismaService
  common/dto/            PaginationDto
  config/                تنظیمات Winston
  exception-filter/      AllExceptionsFilter
prisma/schema.prisma     مدل‌های دیتابیس
seed.ts                  داده‌ی اولیه
```

## نقش‌ها و دسترسی

دو نقش در جدول `Role` وجود دارد: `ADMIN` (id=1) و `OWNER` (id=2).
هر کاربری که ثبت‌نام کند `OWNER` می‌شود.

- `AuthGuard` توکن را بررسی می‌کند و payload را در `req.user` می‌گذارد.
- `RolesGuard` فقط نقش را با `@Roles(...)` تطبیق می‌دهد؛ **باید همراه `AuthGuard` استفاده شود**.
- `OptionalAuthGuard` برای روت‌های عمومی است که با کاربر لاگین‌شده پاسخ متفاوتی می‌دهند.

## احراز هویت

1. `POST /auth/send-phone` با `{ phone }` — یک کد ۶ رقمی ساخته، در جدول `Otp` ذخیره و پیامک می‌شود.
2. `POST /auth/verify-code` با `{ phone, code }` — در صورت درستی، اگر کاربر وجود نداشته باشد ساخته می‌شود و پاسخ `{ access_token, isNewUser }` برمی‌گردد.

شماره‌های تعریف‌شده در `testPhone` داخل `auth.service.ts` بدون ارسال پیامک و با کد ثابت `123456` کار می‌کنند.

## API (خلاصه)

| مسیر | متد | دسترسی |
|---|---|---|
| `/auth/send-phone`, `/auth/verify-code` | POST | عمومی |
| `/business` | GET | عمومی — ناشناس فقط `APPROVED` می‌بیند، OWNER فقط کسب‌وکارهای خودش |
| `/business` | POST | OWNER (multipart، تا ۱۰ تصویر) |
| `/business/:id` | GET / PATCH / DELETE | عمومی / ADMIN و OWNER |
| `/business/:id/status` | PATCH | ADMIN |
| `/business/:id/upload-images` | POST | OWNER |
| `/business/:businessId/image/:imageId` | PATCH / DELETE | OWNER |
| `/business/:id/favorite` | POST / DELETE | کاربر لاگین‌شده |
| `/business/favorites/me` | GET | کاربر لاگین‌شده |
| `/business/:businessId/reviews` | POST | کاربر لاگین‌شده (نظر در انتظار تایید ثبت می‌شود) |
| `/business/:businessId/reviews` | GET | عمومی — فقط نظرهای تاییدشده |
| `/reviews` | GET | OWNER (نظرهای کسب‌وکارهای خودش) / ADMIN (همه) |
| `/reviews/:id/status` | PATCH | OWNER (کسب‌وکار خودش) / ADMIN |
| `/reviews/:id` | PUT / DELETE | صاحب همان نظر |
| `/categories`, `/categories/:id`, `/categories/slug/:slug`, `/categories/:id/businesses` | GET | عمومی |
| `/categories` | POST / PATCH / DELETE | ADMIN |
| `/categories/business/set`, `/categories/business/:businessId` | POST / DELETE | ADMIN و OWNER |
| `/users` | CRUD | ADMIN |
| `/users/profile` | GET / POST | کاربر لاگین‌شده |
| `/role` | GET | ADMIN |
| `/business-image/*` | CRUD | OWNER و ADMIN |
| `/favorite-businesses/*` | CRUD | کاربر لاگین‌شده |

برای جزئیات دقیق بدنه‌ی درخواست/پاسخ، Swagger روی `/api` را ببینید.

### نکات مشترک API

- `ValidationPipe` سراسری با `whitelist` و `forbidNonWhitelisted` فعال است؛ ارسال فیلد تعریف‌نشده خطای ۴۰۰ می‌دهد.
- پیام خطاها کد ثابت‌اند (مثل `PHONE_EXISTS`, `INVALID_OR_EXPIRED_CODE`, `BUSINESS_IMAGE_LIMIT_EXCEEDED`) تا فرانت بتواند ترجمه کند.
- صفحه‌بندی با `take`، `skip` و `lastId` (cursor) انجام می‌شود.
- هر کسب‌وکار در همه‌ی لیست‌ها (شامل لیست بر اساس دسته‌بندی و لیست علاقه‌مندی‌ها) دو فیلد اضافه دارد:
  `reviewsAverage` (میانگین امتیاز با دو رقم اعشار، صفر اگر نظری نباشد) و `reviewsCount` (تعداد نظرات).
- آپلود تصویر: حداکثر ۵ مگابایت، فرمت‌های `jpeg/jpg/png`، حداکثر ۱۰ تصویر برای هر کسب‌وکار.

## جریان تایید نظرها

هر نظری که ثبت می‌شود در حالت **در انتظار تایید** (`isApproved = false`) قرار می‌گیرد و تا وقتی تایید نشود عمومی نمایش داده نمی‌شود:

- `GET /business/:businessId/reviews` فقط نظرهای تاییدشده را برمی‌گرداند. اگر درخواست‌دهنده لاگین کرده باشد، نظر خودش را حتی در حالت در انتظار تایید هم می‌بیند. `average` و `count` همیشه فقط از روی نظرهای تاییدشده حساب می‌شوند.
- `reviewsAverage` و `reviewsCount` در لیست کسب‌وکارها هم فقط نظرهای تاییدشده را می‌شمارند.
- **ویرایش یک نظر آن را دوباره به حالت در انتظار تایید برمی‌گرداند.**

### لیست مدیریت نظرها

`GET /reviews` — مالک کسب‌وکار فقط نظرهای کسب‌وکارهای خودش را می‌بیند، ادمین نظرهای همه را.

| پارامتر | توضیح |
|---|---|
| `take` / `skip` / `lastId` | صفحه‌بندی (پیش‌فرض ۱۰ و ۰) |
| `businessId` | فیلتر روی یک کسب‌وکار مشخص |
| `search` | جست‌وجو روی عنوان کسب‌وکار |
| `isApproved` | `true` فقط تاییدشده‌ها، `false` فقط در انتظار تایید، خالی یعنی همه |

خروجی: `{ reviews, page: { total, take, skip } }` — هر نظر شامل اطلاعات کاربر و کسب‌وکار.

### تایید یا رد

`PATCH /reviews/:id/status` با بدنه‌ی `{ "isApproved": true }` — مالک فقط برای کسب‌وکار خودش (در غیر این صورت `NOT_YOUR_BUSINESS_REVIEW`)، ادمین برای همه. با `false` می‌توان نظر تاییدشده را دوباره پنهان کرد.

## دیتابیس

اسکیما در `prisma/schema.prisma`. مدل‌های اصلی: `Role`, `User`, `Business`, `BusinessSocialLink`, `BusinessImage`, `BusinessReview`, `FavoriteBusiness`, `Category`, `Product`, `ProductImage`, `ProductVariant`, `Order`, `OrderItem`, `Review`, `StockReservation`, `AuditLog`, `Otp`.

نکته: `datasource db` عمداً `url` ندارد؛ اتصال زمان اجرا از طریق driver adapter انجام می‌شود و `DATABASE_URL` فقط توسط Prisma CLI (از طریق `prisma.config.ts`) خوانده می‌شود.

مایگریشن‌های موجود: `0_init` و `20260827120000_review_approval_and_remove_user_role` (افزودن `isApproved`/`approvedAt` و حذف نقش `USER`).

پس از تغییر اسکیما:

```bash
npx prisma migrate dev --name your_migration_name
npm run generate
```

## لاگ‌ها

Winston با چرخش روزانه در پوشه‌ی `logs/`:

- `error-%DATE%.log` — فقط خطاها، ۳۰ روز نگهداری
- `combined-%DATE%.log` — همه‌ی لاگ‌ها، ۱ روز نگهداری

`AllExceptionsFilter` تمام استثناها را با مسیر، متد و stack ثبت می‌کند و پاسخ یکدست `{ statusCode, timestamp, path, message }` برمی‌گرداند.

## دیپلوی

`.github/workflows/deploy.yml` با هر push روی برنچ `dev` اجرا می‌شود: نصب وابستگی‌ها، `npm run build`، سپس rsync کردن `dist/` و `package.json` روی سرور cPanel از طریق SSH و ری‌استارت اپ با `touch tmp/restart.txt`.

بنابراین **قبل از push روی `dev` حتماً `npm run build` را اجرا کنید**؛ اگر بیلد بشکند دیپلوی هم می‌شکند.

Secretهای مورد نیاز در GitHub: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `APP_PATH`.

## کارهای باقی‌مانده

- `ProductsModule` و `FavoriteBusinessModule` هنوز در `app.module.ts` رجیستر نشده‌اند (برای فاز بعدی).
- مدل‌های سفارش (`Order`, `OrderItem`, `StockReservation`) در اسکیما آماده‌اند ولی هنوز ماژول و API ندارند.
- پوشش تست پایین است؛ فایل‌های `*.spec.ts` بیشتر اسکلت پیش‌فرض Nest هستند.
