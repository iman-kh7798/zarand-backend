# بررسی امنیت / معماری / پرفورمنس بک‌اند

> تاریخ بررسی: 2026-09-15 — انجام‌شده توسط Claude Code، قبل از شروع فاز بعدی فیچرها.
> هدف این فایل: لیست کارهایی که باید انجام بشن رو نگه داره تا بین سشن‌ها گم نشه. هر آیتم که انجام شد، از اینجا به بخش «انجام‌شده» در `CLAUDE.md` منتقل بشه و از این فایل حذف/چک بشه.

وضعیت هر آیتم: `[ ]` انجام‌نشده — `[x]` انجام‌شده.

---

## 🔴 بحرانی — اولویت اول

- [ ] **۱. کد OTP مستقیم در پاسخ API لو می‌ره.**
  `src/users/users.service.ts:165` (تابع `saveVerificationCode`):
  ```ts
  return { message: `Verification code sent code: ${code}` };
  ```
  هرکسی با `POST /auth/send-phone` برای هر شماره‌ای (از جمله شماره‌ی کاربران دیگه، حتی ادمین) کد تایید رو مستقیم توی جواب API می‌گیره، بدون نیاز به دسترسی به پیامک. یعنی الان با این باگ می‌شه اکانت هر کسی رو با فقط دونستن شماره‌ش تصرف کرد (account takeover کامل). باید این خط حذف بشه و فقط پیام عمومی (بدون کد) برگرده.

- [ ] **۲. شماره‌های تست با OTP ثابت `123456` در پروداکشن هم فعالن.**
  `src/auth/auth.service.ts:24`:
  ```ts
  testPhone = ['09212921488', '09376551218', '09302207762'];
  ```
  هیچ چک `NODE_ENV`ای نداره — یعنی این سه شماره همیشه (حتی روی سایت لایو) با کد ثابت و بدون پیامک واقعی لاگین می‌شن. باید پشت `NODE_ENV !== 'production'` قفل بشه، یا از یک متغیر env جدا بیاد که فقط توی محیط dev/staging ست می‌شه.

---

## 🟠 مهم — اولویت دوم

- [ ] **۳. CORS به‌صورت صریح تنظیم نشده.**
  توی `src/main.ts` هیچ `app.enableCors(...)`ای صدا زده نمی‌شه. باید با whitelist دقیق دامنه‌ی فرانت (`sevaa.ir` و ساب‌دامین‌های لازم) صریحاً فعال بشه — نه خیلی باز (`origin: true`/`*`) و نه غیرفعال به‌طوری که فرانت واقعی هم بلاک بشه.

- [ ] **۴. Helmet (security headers) نصب نیست.**
  پکیج `helmet` جزو dependencies نیست. باید اضافه بشه و در `main.ts` با `app.use(helmet())` فعال بشه تا هدرهایی مثل `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options` ست بشن. ریسک تقریباً صفر، سود امنیتی بالا.

- [ ] **۵. `getAuthStatus` روی `/auth/send-phone` اطلاعات کاربر رو برای هر شماره‌ای فاش می‌کنه.**
  `src/users/users.service.ts` تابع `getAuthStatus` — برمی‌گردونه که آیا شماره ثبت‌نام کرده و پسورد داره یا نه. یک سطح user-enumeration هست. برای UX فرانت (تشخیص فلوی ثبت‌نام/ورود) لازمه، پس حذفش انتخاب اول نیست؛ ولی باید آگاهانه پذیرفته بشه و شاید محدودش کرد (مثلاً فقط `isNewUser` رو برگردونه، نه `hasPassword`).

---

## 🟡 بدهی فنی با اثر امنیتی/پرفورمنسی (از قبل در CLAUDE.md ثبت شده، اینجا برای تجمیع تکرار شده)

- [ ] **۶. `ioredis` نصبه ولی استفاده نمی‌شه.** SSE bus (`NotificationEventsService`) و SMS worker به‌صورت per-process کار می‌کنن — با بیش از یک instance (لازم برای اسکیل) کاربرِ وصل به instance A از eventهای instance B خبردار نمی‌شه. راه‌حل: Redis pub/sub fan-out.
- [ ] **۷. تکرار providerها به‌جای import ماژول.** چند ماژول (مثلاً `BusinessModule`) سرویس‌های ماژول‌های دیگه (`BusinessImageService`, `CategoriesService`) رو مستقیم توی `providers` خودشون تکرار می‌کنن به‌جای import کردن ماژول مالک — باعث instance جدا (state جدا، اگر جایی cache/state داشته باشن باگ می‌سازه) می‌شه.
- [ ] **۸. اعتبارسنجی ناقص در ریویوها.** `CreateBusinessReviewDto`/`UpdateBusinessReviewDto`: فیلد `body` با `?` مارک شده ولی `@IsOptional()` نداره (عملاً اجباریه — گیج‌کننده و باگ بالقوه)، و `rating` محدودیت ۱ تا ۵ نداره (می‌شه هر عددی، حتی منفی یا خیلی بزرگ، فرستاد).
- [ ] **۹. تست‌ها و لینت بدهی‌دار هستن.** baseline فعلی: ۴ suite / ۴۵ تست fail، و ~۱۱۶ خطای لینت (بیشتر unused imports و `no-unsafe-*`). این‌ها ریسک امنیتی مستقیم نیستن ولی باعث می‌شن باگ واقعی زیر نویز preexisting گم بشه؛ بهتره تدریجی پاک بشن.
- [ ] **۱۰. `Order`/`OrderItem`/`StockReservation`** توی schema هستن ولی route/module ندارن — فعلاً بی‌خطرن چون exposed نیستن، فقط یادآوری برای فاز بعد.

---

## ✅ بررسی شد و مشکلی نداره (نیازی به تغییر نیست)

- `UploadService` (`src/upload/upload.service.ts`) در برابر path traversal ایمنه — `toAbsolutePath` چک `relative(...).startsWith('..')` داره و `safeFilename` مسیر رو از originalname پاک می‌کنه.
- پسوردها با bcrypt (`SALT_ROUNDS=10`) هش می‌شن؛ `passwordHash` همه‌جا با destructuring از پاسخ‌ها حذف می‌شه.
- `JWT_SECRET` اجباریه — بدون آن اپ بالا نمی‌آد (`src/auth/constants.ts`).
- Throttler روی مسیرهای حساس (`send-phone`, `verify-code`, `register`, `login`, `reset-password`, فرم‌های عمومی) درست و سخت‌گیرانه تنظیم شده.
- هیچ `.env` واقعی یا secret دیگه‌ای commit نشده (چک شد: `git ls-files` و `git log` برای `.env`).
- Global `ValidationPipe` با `whitelist + forbidNonWhitelisted + transform` فعاله.

---

## نکته درباره‌ی نگهداری این فایل

وقتی هر آیتم رفع شد:
1. چک‌باکس رو به `[x]` تغییر بده.
2. یک خط خلاصه به بخش «Already done» در `CLAUDE.md` اضافه کن (طبق فرمت موجود اونجا).
3. وقتی همه‌ی آیتم‌های یک بخش (🔴/🟠/🟡) تیک خوردن، می‌تونی اون بخش رو از این فایل حذف کنی تا فایل کوتاه بمونه.
