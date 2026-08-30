# CLAUDE.md — راهنمای کار روی این مخزن

> فایل راهنمای داخلی برای Claude Code. هدف: بدون کاوش دوباره‌ی کل پروژه، سریع و مطابق کانونشن‌های موجود کد بزنم.

## پروژه چیست

`zarand-backend` — بک‌اند NestJS 11 + Prisma 7 (MySQL/MariaDB) برای یک دایرکتوری/مارکت‌پلیس محلی: کاربران، کسب‌وکارها (business)، دسته‌بندی‌ها، تصاویر، نظرات و علاقه‌مندی‌ها. احراز هویت با OTP پیامکی (Kavenegar) و JWT.

- زبان کد: TypeScript. کامنت‌ها اغلب فارسی‌اند — همین سبک را ادامه بده.
- برنچ کاری: `dev` (برنچ اصلی: `master`). push روی `dev` باعث دیپلوی خودکار می‌شود (پایین را ببین).

## دستورهای پرکاربرد

```bash
npm run start:dev      # اجرا با watch
npm run build          # nest build → dist/
npm run start:prod     # node dist/src/main
npm run lint           # eslint --fix
npm run format         # prettier
npm test               # jest (۷ فایل spec، اغلب اسکلت پیش‌فرض Nest)
npm run generate       # prisma generate
npm run push           # prisma db push
npm run deploy         # prisma migrate deploy
npm run seed           # ts-node seed.ts  (نقش‌ها + ادمین اولیه)
```

Swagger روی `/api` بالا می‌آید (auth با `Bearer` و کلید `access-token`).
فایل‌های آپلودشده به‌صورت استاتیک روی `/uploads` سرو می‌شوند.

## ساختار

```
src/
  main.ts            bootstrap: Swagger + ValidationPipe سراسری + AllExceptionsFilter
  app.module.ts      رجیستر ماژول‌ها (⚠️ ProductsModule و FavoriteBusinessModule کامنت‌اند)
  auth/              OTP + JWT، AuthGuard، OptionalAuthGuard، constants (secret)
  role/              Role enum (ADMIN | OWNER)، Roles decorator، RolesGuard، role controller/service
  users/             CRUD کاربر + OTP (saveVerificationCode/findValidOtp/expireValidOtp)
  business/          هسته‌ی پروژه — بزرگ‌ترین سرویس (~433 خط)
  business-image/    تصاویر کسب‌وکار
  business-review/   امتیاز و نظر کسب‌وکار + جریان تایید (business/:id/reviews و reviews/*)
  categories/        دسته‌بندی درختی + اتصال به business
  favorite-business/ علاقه‌مندی‌ها (ماژولش در app.module فعال نیست؛ سرویسش مستقیم استفاده می‌شود)
  products/, product-image/  کد موجود ولی ماژولش رجیستر نشده → این روت‌ها فعال نیستند
  upload/            نوشتن/حذف فایل روی دیسک (process.cwd()/uploads)
  sms/               Kavenegar
  prisma/            PrismaService (driver adapter)
  common/dto/        PaginationDto (take/skip/lastId)
  config/            winston (daily rotate: logs/error-*.log و logs/combined-*.log)
  exception-filter/  AllExceptionsFilter — همه‌ی خطاها را در winston لاگ می‌کند
```

## کانونشن‌هایی که باید رعایت کنم

**۱. الگوی ماژول:** هر فیچر = `x.module.ts` + `x.controller.ts` + `x.service.ts` + `dto/create-x.dto.ts` + `dto/update-x.dto.ts` (با `PartialType` از `@nestjs/mapped-types`). سرویس‌ها `PrismaService` را مستقیم تزریق می‌کنند؛ لایه‌ی repository جدا وجود ندارد.

**۲. ایمپورت‌ها:** مسیر مطلق با پیشوند `src/` (مثل `import { AuthGuard } from 'src/auth/auth.guard'`)، نه alias مثل `@/`.

**۰. نقش‌ها فقط دو تاست: `ADMIN` و `OWNER`.** نقش `USER` کاملاً حذف شده — نه در enum هست، نه در seed، نه در دیتابیس. هر کسی ثبت‌نام کند `OWNER` می‌شود (`roleId: 2` در `auth.service.ts`). هیچ‌وقت `Role.User` را برنگردان.

**۳. گاردها — مهم:** `RolesGuard` خودش توکن را چک نمی‌کند، فقط `request.user.role` را با متادیتای `Roles()` مقایسه می‌کند. پس همیشه:

```ts
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)   // ترتیب مهم است
@Roles(Role.Admin, Role.Owner)
```

برای روت‌های عمومی که با لاگین رفتار متفاوتی دارند از `OptionalAuthGuard` استفاده می‌شود (توکن نامعتبر بلاک نمی‌کند، فقط `req.user` ست نمی‌شود).
`Roles(...)` بدون `RolesGuard` هیچ اثری ندارد — چند جا (مثل `business/favorites/me`) همین‌طور است؛ اگر جایی چنین دیدی عمداً تغییرش نده مگر خواسته شود.

**۴. کاربر جاری:** دکوریتور اختصاصی نداریم. الگوی رایج:

```ts
@Req() req: { user: { sub: string; role: Role } }
const userId = req.user.sub;   // sub = user.id (uuid)
```

payload توکن: `{ sub, phone, role, name }`.

**۵. ValidationPipe سراسری** با `whitelist + forbidNonWhitelisted + transform`:

- هر فیلدی که در DTO تعریف نشده باشد → ۴۰۰. پس موقع افزودن فیلد جدید حتماً DTO را آپدیت کن.
- ورودی‌های multipart همه رشته‌اند → در DTOها از `@IsNumberString()` برای `phone`/`lat`/`lng` استفاده شده. همین را ادامه بده.
- شماره موبایل: `@Matches(/^(\+98|0098|0)?9\d{9}$/)`.

**۶. پیام خطاها کد UPPER_SNAKE هستند**، نه جمله‌ی انسانی: `PHONE_EXISTS`, `INVALID_OR_EXPIRED_CODE`, `BUSINESS_IMAGE_LIMIT_EXCEEDED`, `DUPLICATE_SOCIAL_PLATFORM`, `USER_NOT_EXISTS`. برای خطاهای جدید همین سبک را نگه دار.

**۷. خطاهای Prisma دستی map می‌شوند** داخل `try/catch` سرویس:
`P2002` → `BadRequestException` (یکتایی)، `P2025` → `NotFoundException`، `P2003` → کلید خارجی.

**۸. آپلود فایل:** کنترلر با `FileInterceptor`/`FilesInterceptor` + `ParseFilePipe` (سقف ۵MB، `jpeg|jpg|png`) فایل می‌گیرد، `UploadService.create(Many)` روی دیسک می‌نویسد و `{ filename, path }` برمی‌گرداند (`path` = `/uploads/...`). **اگر عملیات دیتابیس شکست خورد حتماً `uploadService.removeMany(...)` را صدا بزن** — این الگوی جبران در `business.service` و `categories.service` رعایت شده. سقف تصاویر هر business = ۱۰.

**۹. صفحه‌بندی:** `take`/`skip` + `lastId` به‌عنوان cursor؛ پاسخ به شکل `{ items, page: { total, take, skip } }`.

**۱۰. جریان تایید نظرها:** `BusinessReview.isApproved` پیش‌فرض `false` است. نظر جدید — و هر **ویرایش** نظر — به حالت در انتظار تایید برمی‌گردد (`isApproved: false`, `approvedAt: null`). فقط `OWNER` کسب‌وکار مربوطه و `ADMIN` می‌توانند تایید کنند. هر کوئری‌ای که آمار یا لیست عمومی نظر می‌دهد **باید** `isApproved: true` را فیلتر کند.

**۱۱. آمار نظرات در لیست کسب‌وکارها:** هر جا لیستی از business برگردانده می‌شود باید `reviewsAverage` و `reviewsCount` هم داشته باشد. برای این کار از `BusinessReviewService.withStats(rows)` استفاده کن (یا `getStatsFor(ids)` اگر ساختار تودرتو است) — با یک `groupBy` برای کل لیست کار می‌کند، پس داخل `map` صدایش نزن. اگر لیست جدیدی اضافه کردی، همین کار را برایش انجام بده.

**۱۲. هرگز `passwordHash` را برنگردان** — در `users.service` با destructuring حذف می‌شود.

## دیتابیس / Prisma

- `prisma/schema.prisma` — `datasource db` **بدون `url`** است؛ اتصال از طریق driver adapter `@prisma/adapter-mariadb` در `PrismaService` با env های `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` انجام می‌شود. `DATABASE_URL` فقط برای CLI (در `prisma.config.ts`) لازم است.
  - هر دو مسیر (`PrismaService` و `seed.ts`) fallback به `localhost:3306` دارند. دقت کن `DATABASE_URL` و `DATABASE_HOST` به یک سرور اشاره کنند.
- مدل‌ها: `Role, User, Business, BusinessSocialLink, FavoriteBusiness, Category, Product, ProductImage, BusinessImage, ProductVariant, Order, OrderItem, Review, BusinessReview, StockReservation, AuditLog, Otp`.
  - سفارش/سبد خرید (`Order`, `OrderItem`, `StockReservation`) در اسکیما هست ولی **هیچ ماژول/روتی برایش وجود ندارد**.
- کلیدها: `String @db.Char(36)` با `uuid()`؛ `Role.id` عدد صحیح است (۱=ADMIN، ۲=OWNER، ۳=USER طبق `seed.ts`).
- `Business.status`: `PENDING | APPROVED | REJECTED`. کاربر ناشناس فقط `APPROVED` می‌بیند.
- بعد از تغییر اسکیما: `npx prisma migrate dev --name ...` سپس `npm run generate`.
- مایگریشن‌ها: `0_init` و `20260827120000_review_approval_and_remove_user_role`.
- ⚠️ دیتابیس از محیط توسعه‌ی من در دسترس نیست، پس `migrate dev` قابل اجرا نیست. برای ساخت مایگریشن جدید بدون دیتابیس:
  `npx prisma migrate diff --from-schema <اسکیمای-قبلی> --to-schema prisma/schema.prisma --script`
  (در Prisma 7 فلگ‌ها `--from-schema`/`--to-schema` هستند، نه `--from-schema-datamodel`.)

## نقشه‌ی روت‌ها (خلاصه)

| مسیر                                                                                 | متد                  | دسترسی                                                    |
| ------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------- |
| `auth/send-phone`, `auth/verify-code`                                                | POST                 | عمومی                                                     |
| `business`                                                                           | GET                  | Optional auth — ناشناس فقط APPROVED؛ OWNER فقط مال خودش   |
| `business`                                                                           | POST                 | OWNER (multipart، تا ۱۰ عکس)                              |
| `business/:id`                                                                       | GET / PATCH / DELETE | Optional / ADMIN+OWNER                                    |
| `business/:id/status`                                                                | PATCH                | ADMIN                                                     |
| `business/:id/upload-images`, `:businessId/image/:imageId`                           | POST/PATCH/DELETE    | OWNER                                                     |
| `business/:businessId/images/:imageId/set-main`                                      | PATCH                | ADMIN + OWNER (مالکِ همان کسب‌وکار) — ست تصویر اصلی/کاور  |
| `business/:id/favorite`, `business/favorites/me`                                     | POST/DELETE/GET      | لاگین                                                     |
| `business/:businessId/reviews`                                                       | POST                 | لاگین                                                     |
| `business/:businessId/reviews`                                                       | GET                  | عمومی — فقط تاییدشده‌ها (+ نظر خود کاربر لاگین‌کرده)      |
| `reviews`                                                                            | GET                  | OWNER (فقط کسب‌وکار خودش) / ADMIN (همه) — لیست مدیریت     |
| `reviews/:id/status`                                                                 | PATCH                | OWNER (کسب‌وکار خودش) / ADMIN — تایید یا رد               |
| `reviews/:id`                                                                        | PUT / DELETE         | فقط صاحب همان نظر                                         |
| `categories`, `categories/:id`, `categories/slug/:slug`, `categories/:id/businesses` | GET                  | عمومی                                                     |
| `categories` (POST/PATCH/DELETE), `categories/business/set`                          | —                    | ADMIN (ست‌کردن دسته: ADMIN+OWNER)                         |
| `users` CRUD                                                                         | —                    | ADMIN؛ `users/profile` (GET/POST) برای همه‌ی لاگین‌شده‌ها |
| `role`                                                                               | GET                  | ADMIN                                                     |
| `favorite-businesses/*`                                                              | —                    | لاگین (ماژول رجیستر نشده)                                 |
| `products/*`, `product-image/*`                                                      | —                    | **غیرفعال** (ماژول در app.module کامنت است)               |

## احراز هویت (جریان OTP)

`send-phone` → کد ۶ رقمی در جدول `Otp` ذخیره و پیامک می‌شود → `verify-code` → اگر کاربر نبود ساخته می‌شود (`roleId: 2` = OWNER) و `{ access_token, isNewUser }` برمی‌گردد.
شماره‌های تست در `auth.service.ts` (`testPhone`) با کد ثابت `123456` بدون پیامک کار می‌کنند.

secret و انقضای توکن از env می‌آیند (`JWT_SECRET` اجباری است — اگر نباشد اپ با خطا بالا نمی‌آید — و `JWT_EXPIRES_IN` پیش‌فرض `3600s`). هر دو در `src/auth/constants.ts` خوانده می‌شوند.

## دیپلوی

`.github/workflows/deploy.yml` — روی push به `dev`: build، سپس rsync کردن `dist/` + `package.json` به cPanel با SSH و `touch tmp/restart.txt`. یعنی **کد باید حتماً build شود وگرنه دیپلوی می‌شکند** → قبل از commit روی `dev` حتماً `npm run build`.

## وضعیت تست‌ها (خط پایه)

`npm test` در حال حاضر **۴ suite / ۴۵ تست fail** دارد و ۲۱ تست pass — این وضعیت از قبل وجود داشته و ربطی به تغییرات اخیر ندارد. علت اصلی: `Nest can't resolve dependencies` در spec ها (مثلاً `categories.controller.spec.ts`). موقع ارزیابی تغییرات خودم، این عدد را به‌عنوان خط پایه در نظر بگیر و فقط بررسی کن بدتر نشده باشد.

`npm run lint` هم حدود ۱۱۶ خطای از قبل موجود دارد (اغلب unused import و `no-unsafe-*`).
⚠️ اسکریپت `lint` فلگ `--fix` دارد و فایل‌های نامرتبط را هم تغییر می‌دهد؛ بعد از اجرای آن حتماً `git status` بگیر و تغییرات خارج از دامنه را `git checkout --` کن.

## نکات و بدهی‌های فنی (بدون درخواست کاربر خودسرانه تغییرشان نده، ولی بدان)

1. `ioredis` نصب است ولی هیچ‌جا استفاده نمی‌شود.
2. ماژول‌ها به‌جای import کردن ماژولِ صاحبِ سرویس، خودِ سرویس را در `providers` تکرار می‌کنند (مثلاً `BusinessModule` که `BusinessImageService` و `CategoriesService` را provide می‌کند) — این باعث نمونه‌های مجزا می‌شود.
3. در `CreateBusinessReviewDto` و `UpdateBusinessReviewDto`، فیلد `body` با `?` علامت‌گذاری شده ولی `@IsOptional()` ندارد → عملاً اجباری است. همچنین `rating` هیچ محدودیت ۱ تا ۵ ندارد.
4. مدل‌های `Order`, `OrderItem`, `StockReservation` در اسکیما هستند ولی ماژول/روت ندارند — برای فاز بعدی.
5. `ProductsModule` و `FavoriteBusinessModule` عمداً در `app.module.ts` کامنت‌اند و قرار است بعداً فعال شوند — کامنتشان را برندار.

## کارهایی که قبلاً انجام شده (تکرارشان نکن)

- کلیدهای `gh_deploy_key` از گیت untrack و به `.gitignore` اضافه شدند. (کاربر باید کلید را rotate کند و تاریخچه‌ی گیت را پاک کند.)
- `env.example` از مقادیر واقعی پاک و به نمونه‌ی کامل تبدیل شد.
- JWT secret از هاردکد به `JWT_SECRET` در env منتقل شد (با fail-fast).
- `DATABASE_HOST`/`DATABASE_PORT` به env و به هر دو مسیر اتصال اضافه شد.
- دسترسی ثبت/ویرایش نظر در `business-review` به `User, Owner, Admin` باز شد (مالکیت همچنان در سرویس چک می‌شود).
- `PROJECT_DOCUMENTATION.md` بازنویسی شد.
- نقش `USER` کاملاً حذف شد (enum، همه‌ی `@Roles`، seed و دیتابیس از طریق مایگریشن).
- جریان تایید نظرها اضافه شد: `isApproved`/`approvedAt` روی `BusinessReview`، لیست مدیریت `GET /reviews` و `PATCH /reviews/:id/status`.
- تصویر اصلی/کاور گالری کسب‌وکار: فیلد `BusinessImage.isPrimary` + مایگریشن `20260830120000_business_image_primary` (بک‌فیل قدیمی‌ترین تصویر هر کسب‌وکار). اندپوینت `PATCH business/:businessId/images/:imageId/set-main` (تراکنش: صفر کردن بقیه + ست انتخابی، احراز مالکیت در `BusinessService.assertBusinessManageable`). حذف تصویر اصلی → اولین تصویر باقی‌مانده جانشین می‌شود. `addImages` اگر کسب‌وکار تصویر اصلی نداشته باشد اولین تصویر جدید را اصلی می‌کند؛ در `POST /business` فیلد اختیاری `mainImageIndex` (رشته، ایندکس داخل `files`) کاور را تعیین می‌کند. `findOne` تصاویر را با تصویر اصلی اول برمی‌گرداند و فیلد `mainImage` جدا هم دارد؛ همین ترتیب (`PRIMARY_IMAGE_ORDER`) در همه‌ی لیست‌های business اعمال شد.
- `reviewsAverage` / `reviewsCount` به همه‌ی لیست‌های business اضافه شد (`BusinessService.listBusinesses`, `getFavorites` و لیست‌های `CategoriesService`). چهار متد `findAll/findByStatus/findPerOwner/findPerOwnerByStatus` روی هلپر خصوصی `listBusinesses` یکی شدند.

## Codebase Navigation & Search

### Primary Rule

Use `codebase-memory-mcp` as the **primary tool for navigating, searching, and understanding the codebase**.

Before searching the repository manually, use `codebase-memory-mcp` whenever the location, relationship, or impact of the code is not already known.

### Use codebase-memory-mcp for

- Finding files, classes, functions, methods, variables, DTOs, services, controllers, models, and other symbols.
- Finding references and usages of a symbol.
- Understanding relationships and dependencies between parts of the codebase.
- Tracing call chains and execution flow.
- Performing impact analysis before modifying existing functionality.
- Finding all relevant code affected by a feature or schema change.
- Understanding the architecture and structure of the project.
- Finding related code before implementing a new feature.
- Investigating how an existing feature works.

### Do NOT use codebase-memory-mcp unnecessarily

If the exact file path is already known, read the file directly.

Do not use `codebase-memory-mcp` simply to locate a file whose path is already known.

Use direct file reading/editing tools for inspecting and modifying the actual source code.

### Search Workflow

When the location or impact of a change is unknown, follow this workflow:

1. Use `codebase-memory-mcp` to locate relevant files and symbols.
2. Use `codebase-memory-mcp` to find references, dependencies, and related code.
3. Read the identified source files directly.
4. Understand the existing implementation before making changes.
5. Make the smallest consistent change required.
6. Check related code for regressions or required updates.
7. Run the relevant tests, type checks, linting, or build commands when applicable.

Avoid manually scanning the entire repository with generic search tools unless `codebase-memory-mcp` cannot provide the required information.

### Before Modifying Existing Code

Before modifying an existing feature, first use `codebase-memory-mcp` to understand:

- Where the functionality is implemented.
- Which files and symbols depend on it.
- Which files it depends on.
- Where it is referenced or consumed.
- Whether the change can affect other parts of the application.

Do not modify code based only on the first matching file when the change may have wider impact.

### NestJS Architecture

For NestJS changes, when relevant, inspect the complete flow:

`Controller → DTO → Service → Prisma → Database`

Also check related modules, guards, interceptors, pipes, repositories, and consumers when applicable.

### Prisma / Database Changes

Before modifying `schema.prisma` or a Prisma model:

1. Use `codebase-memory-mcp` to find usages of the affected model and fields.
2. Check related DTOs, services, controllers, queries, and business logic.
3. Identify code that may break because of the schema change.
4. Apply the schema change.
5. Update all affected code consistently.
6. Run the appropriate Prisma generation, type checks, tests, and migrations when required.

### API Changes

Before changing an API endpoint, inspect:

- Controller
- Request DTO
- Response DTO
- Service
- Prisma/database queries
- Validation
- Guards/authentication
- Related API consumers

Use `codebase-memory-mcp` to find references and dependencies before making the change.

### General Principle

`codebase-memory-mcp` is the **primary tool for codebase discovery and code understanding**.

Direct file tools are the **primary tools for reading and modifying source code**.

Prefer understanding the impact of a change before editing rather than discovering dependencies after the change has already been made.
