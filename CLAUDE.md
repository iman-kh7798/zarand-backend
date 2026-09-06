# CLAUDE.md — working guide for this repo

> Internal guide for Claude Code. Goal: code fast and in line with existing conventions without re-exploring the whole project.

## Searching the project

This repo is indexed with `codebase-memory-mcp`. For any structural search (finding a symbol, callers/callees, following a call chain, impact analysis, architecture) use the graph tools **first**: `search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, `get_architecture`. Fall back to `grep`/`search_code` only for free-text/non-code matches or when graph coverage is insufficient. The index auto-refreshes in the background; only call `index_repository` if the repo is not indexed.

## What the project is

`zarand-backend` — NestJS 11 + Prisma 7 (MySQL/MariaDB) backend for a local directory/marketplace: users, businesses, categories, images, reviews and favorites. Auth via SMS OTP (Kavenegar) and JWT.

- Code language: TypeScript. Code comments are mostly in Persian — keep that style.
- Working branch: `dev` (main branch: `master`). Push to `dev` triggers auto-deploy (see below).

## Common commands

```bash
npm run start:dev      # watch mode
npm run build          # nest build → dist/
npm run start:prod     # node dist/src/main
npm run lint           # eslint --fix
npm run format         # prettier
npm test               # jest (7 spec files, mostly default Nest skeletons)
npm run generate       # prisma generate
npm run push           # prisma db push
npm run deploy         # prisma migrate deploy
npm run seed           # ts-node seed.ts  (roles + initial admin)
```

Swagger is served at `/api` (auth uses `Bearer` with key `access-token`).
Uploaded files are served statically at `/uploads`.

## Structure

```
src/
  main.ts            bootstrap: Swagger + global ValidationPipe + AllExceptionsFilter
  app.module.ts      module registration (⚠️ ProductsModule and FavoriteBusinessModule are commented out)
  auth/              OTP + JWT, AuthGuard, OptionalAuthGuard, constants (secret)
  role/              Role enum (ADMIN | OWNER), Roles decorator, RolesGuard, role controller/service
  users/             user CRUD + OTP (saveVerificationCode/findValidOtp/expireValidOtp)
  business/          project core — largest service (~433 lines)
  business-image/    business images
  business-review/   business rating & review + approval flow (business/:id/reviews and reviews/*)
  business-report/   public "fix business info" reports (business-reports/*) — admin + owner (own only)
  categories/        tree categories + link to business
  favorite-business/ favorites (module not enabled in app.module; its service is used directly)
  products/, product-image/  code exists but module not registered → these routes are inactive
  upload/            write/delete files on disk (process.cwd()/uploads)
  sms/               Kavenegar
  prisma/            PrismaService (driver adapter)
  common/dto/        PaginationDto (take/skip/lastId)
  config/            winston (daily rotate: logs/error-*.log and logs/combined-*.log)
  exception-filter/  AllExceptionsFilter — logs every error to winston
```

## Conventions to follow

**1. Module pattern:** each feature = `x.module.ts` + `x.controller.ts` + `x.service.ts` + `dto/create-x.dto.ts` + `dto/update-x.dto.ts` (with `PartialType` from `@nestjs/mapped-types`). Services inject `PrismaService` directly; there is no separate repository layer.

**2. Imports:** absolute paths with `src/` prefix (e.g. `import { AuthGuard } from 'src/auth/auth.guard'`), not aliases like `@/`.

**3. Roles are only two: `ADMIN` and `OWNER`.** The `USER` role is fully removed — not in the enum, not in seed, not in the DB. Anyone who signs up becomes `OWNER` (`roleId: 2` in `auth.service.ts`). Never return `Role.User`.

**4. Guards — important:** `RolesGuard` does not check the token itself, it only compares `request.user.role` against `Roles()` metadata. So always:

```ts
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)   // order matters
@Roles(Role.Admin, Role.Owner)
```

For public routes that behave differently when logged in, use `OptionalAuthGuard` (an invalid token does not block, it just leaves `req.user` unset).
`Roles(...)` without `RolesGuard` has no effect — this is the case in a few places (e.g. `business/favorites/me`); if you see this, don't change it intentionally unless asked.

**5. Current user:** no dedicated decorator. Common pattern:

```ts
@Req() req: { user: { sub: string; role: Role } }
const userId = req.user.sub;   // sub = user.id (uuid)
```

Token payload: `{ sub, phone, role, name }`.

**6. Global ValidationPipe** with `whitelist + forbidNonWhitelisted + transform`:

- Any field not defined in the DTO → 400. So always update the DTO when adding a new field.
- multipart inputs are all strings → DTOs use `@IsNumberString()` for `phone`/`lat`/`lng`. Keep doing that.
- Phone number: `@Matches(/^(\+98|0098|0)?9\d{9}$/)`.

**7. Error messages are UPPER_SNAKE codes**, not human sentences: `PHONE_EXISTS`, `INVALID_OR_EXPIRED_CODE`, `BUSINESS_IMAGE_LIMIT_EXCEEDED`, `DUPLICATE_SOCIAL_PLATFORM`, `USER_NOT_EXISTS`. Keep this style for new errors.

**8. Prisma errors are mapped manually** inside the service `try/catch`:
`P2002` → `BadRequestException` (uniqueness), `P2025` → `NotFoundException`, `P2003` → foreign key.

**9. File upload:** the controller takes files with `FileInterceptor`/`FilesInterceptor` + `ParseFilePipe` (max 5MB, `jpeg|jpg|png`), `UploadService.create(Many)` writes to disk and returns `{ filename, path }` (`path` = `/uploads/...`). **If the DB operation fails you must call `uploadService.removeMany(...)`** — this compensation pattern is followed in `business.service` and `categories.service`. Image limit per business = 10.

**10. Pagination:** `take`/`skip` + `lastId` as cursor; response shape `{ items, page: { total, take, skip } }`.

**11. Review approval flow:** `BusinessReview.status` is an enum `BusinessReviewStatus` (`PENDING | APPROVED | REJECTED`), default `PENDING`. A new review — and every **edit** of a review — goes back to `status: PENDING`, `approvedAt: null`. Only the `OWNER` of the related business and `ADMIN` can change status (`PATCH /reviews/:id/status` with body `{ status }`); `setStatus` sets `approvedAt` only when `APPROVED`. Every query that returns public review stats or lists **must** filter `status: 'APPROVED'`. The moderation list `GET /reviews` accepts an optional `status` filter (and OWNER is always scoped to their own businesses; `?businessId=` narrows further).

**12. Review stats in business lists:** wherever a list of businesses is returned it must also include `reviewsAverage` and `reviewsCount`. Use `BusinessReviewService.withStats(rows)` (or `getStatsFor(ids)` for nested structures) — it works with one `groupBy` for the whole list, so don't call it inside a `map`. If you add a new list, do the same for it.

**13. Never return `passwordHash`** — it is stripped via destructuring in `users.service`.

## Database / Prisma

- `prisma/schema.prisma` — `datasource db` has **no `url`**; the connection goes through the `@prisma/adapter-mariadb` driver adapter in `PrismaService` using env vars `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`. `DATABASE_URL` is only needed for the CLI (in `prisma.config.ts`).
  - Both paths (`PrismaService` and `seed.ts`) fall back to `localhost:3306`. Make sure `DATABASE_URL` and `DATABASE_HOST` point to the same server.
- Models: `Role, User, Business, BusinessSocialLink, FavoriteBusiness, Category, Product, ProductImage, BusinessImage, ProductVariant, Order, OrderItem, Review, BusinessReview, StockReservation, AuditLog, Otp, Feedback, BusinessReport, BlogCategory, BlogPost`.
  - `BusinessReview.status` is enum `BusinessReviewStatus` (`PENDING`/`APPROVED`/`REJECTED`) — replaced the old `isApproved` boolean (migration `20260902160000_review_status_enum`, which backfills `isApproved=true` → `APPROVED`).
  - Order/cart (`Order`, `OrderItem`, `StockReservation`) exist in the schema but have **no module/route**.
- Keys: `String @db.Char(36)` with `uuid()`; `Role.id` is an integer (1=ADMIN, 2=OWNER, 3=USER per `seed.ts`).
- `Business.status`: `PENDING | APPROVED | REJECTED`. Anonymous users only see `APPROVED`.
- After a schema change: `npx prisma migrate dev --name ...` then `npm run generate`.
- Migrations: `0_init`, `20260827120000_review_approval_and_remove_user_role`, `20260902144603_add_feedback`, `20260902150406_add_business_report`, `20260902160000_review_status_enum`, `20260903120000_business_image_is_primary`, `20260904120000_add_blog_module`.
- ⚠️ The DB is not reachable from my dev environment, so `migrate dev` cannot run. To create a new migration without a DB:
  `npx prisma migrate diff --from-schema <old-schema> --to-schema prisma/schema.prisma --script`
  (in Prisma 7 the flags are `--from-schema`/`--to-schema`, not `--from-schema-datamodel`.)

## Route map (summary)

| Path                                                                                 | Method               | Access                                                             |
| ------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------ |
| `auth/send-phone`, `auth/verify-code`                                                | POST                 | public                                                             |
| `business`                                                                           | GET                  | Optional auth — anon sees only APPROVED; OWNER sees only their own |
| `business`                                                                           | POST                 | OWNER (multipart, up to 10 images)                                 |
| `business/:id`                                                                       | GET / PATCH / DELETE | Optional / ADMIN+OWNER                                             |
| `business/:id/status`                                                                | PATCH                | ADMIN                                                              |
| `business/:id/upload-images`, `:businessId/image/:imageId`                           | POST/PATCH/DELETE    | OWNER                                                              |
| `business/:id/favorite`, `business/favorites/me`                                     | POST/DELETE/GET      | logged in                                                          |
| `business/:businessId/reviews`                                                       | POST                 | logged in                                                          |
| `business/:businessId/reviews`                                                       | GET                  | public — only approved (+ the logged-in user's own review)         |
| `reviews`                                                                            | GET                  | OWNER (own business only) / ADMIN (all) — management list          |
| `reviews/:id/status`                                                                 | PATCH                | OWNER (own business) / ADMIN — body `{ status: PENDING\|APPROVED\|REJECTED }` |
| `reviews/:id`                                                                        | PUT / DELETE         | only the review's own author                                       |
| `categories`, `categories/:id`, `categories/slug/:slug`, `categories/:id/businesses` | GET                  | public                                                             |
| `categories` (POST/PATCH/DELETE), `categories/business/set`                          | —                    | ADMIN (setting a category: ADMIN+OWNER)                            |
| `users` CRUD                                                                         | —                    | ADMIN; `users/profile` (GET/POST) for all logged-in users          |
| `role`                                                                               | GET                  | ADMIN                                                              |
| `feedback`                                                                           | POST                 | public — site suggestion/feedback form (name, contact?, message)   |
| `feedback`, `feedback/:id`, `feedback/:id/read`                                       | GET / PATCH / DELETE | ADMIN — list (take/skip/lastId/search/isRead), view, mark read, delete |
| `business-reports`                                                                   | POST                 | public — "fix business info" form (`businessId`, `type`, `description?`); `description` required unless `type` is `BUSINESS_CLOSED`/`DUPLICATE`; texts the business owner (best-effort) |
| `business-reports`, `business-reports/:id`                                            | GET                  | ADMIN (all) / OWNER (own businesses only) — filters take/skip/lastId/businessId/type/status/isRead/search |
| `business-reports/:id/status`, `business-reports/:id/read`                            | PATCH                | ADMIN / OWNER (own business) — set status (`PENDING`/`RESOLVED`/`REJECTED`) or read flag |
| `business-reports/:id`                                                               | DELETE               | ADMIN                                                              |
| `blog`                                                                               | GET                  | public — only `PUBLISHED`; `categorySlug`/`search`/`take`/`skip`     |
| `blog/admin`                                                                         | GET                  | ADMIN (same guard as `POST /blog`) — all statuses, `createdAt` desc; filters `status`/`categoryId`/`search`/`take`/`skip`; same `{ posts, page }` shape |
| `blog/categories`                                                                    | GET                  | public — id/name/slug list                                          |
| `blog/:idOrSlug`                                                                     | GET                  | public (optional auth) — resolves by slug then id; DRAFT visible only to ADMIN; bumps view for non-admins only |
| `blog` (POST), `blog/:id` (PATCH/DELETE)                                             | —                    | ADMIN                                                              |
| `blog/categories` (POST), `blog/categories/:id` (PATCH/DELETE)                       | —                    | ADMIN — DELETE fails if category has posts                          |
| `blog/upload-cover`                                                                  | POST                 | ADMIN — multipart field `file` (jpg/png/webp, 5MB) → `{ url }`      |
| `favorite-businesses/*`                                                              | —                    | logged in (module not registered)                                  |
| `products/*`, `product-image/*`                                                      | —                    | **inactive** (module commented out in app.module)                  |

## Auth (OTP flow)

`send-phone` → a 6-digit code is stored in the `Otp` table and texted → `verify-code` → if the user didn't exist they are created (`roleId: 2` = OWNER) and `{ access_token, isNewUser }` is returned.
Test phone numbers in `auth.service.ts` (`testPhone`) work with the fixed code `123456` and no SMS.

Token secret and expiry come from env (`JWT_SECRET` is required — the app fails to start without it — and `JWT_EXPIRES_IN` defaults to `3600s`). Both are read in `src/auth/constants.ts`.

## Deploy

`.github/workflows/deploy.yml` — on push to `dev`: build, then rsync `dist/` + `package.json` to cPanel over SSH and `touch tmp/restart.txt`. So **the code must build or the deploy breaks** → always run `npm run build` before committing to `dev`.

## Test status (baseline)

`npm test` currently has **4 suites / 45 tests failing** and 21 passing (46 passing after the blog module's 25 specs) — this predates my changes and is unrelated. Main cause: `Nest can't resolve dependencies` in specs (e.g. `categories.controller.spec.ts`). When evaluating my own changes, treat this number as the baseline and only check that it didn't get worse.
⚠️ The `test/*.e2e-spec.ts` config (`test/jest-e2e.json`) does **not** resolve `src/`-prefixed imports, so any e2e spec that pulls in a controller/service using `import ... from 'src/...'` fails to load (both existing e2e specs are broken this way). Put controller HTTP/supertest specs in `src/<feature>/*.controller.spec.ts` instead — the unit jest config in `package.json` resolves `src/`. Also, `await import(...)` inside a spec throws under the unit config (`--experimental-vm-modules` off); use static imports.

`npm run lint` also has ~116 pre-existing errors (mostly unused imports and `no-unsafe-*`).
⚠️ The `lint` script has `--fix` and also changes unrelated files; after running it always `git status` and `git checkout --` the out-of-scope changes.

## Notes & tech debt (don't change these on a whim without a user request, but be aware)

1. `ioredis` is installed but used nowhere.
2. Modules repeat the service in their `providers` instead of importing the module that owns it (e.g. `BusinessModule` providing `BusinessImageService` and `CategoriesService`) — this creates separate instances.
3. In `CreateBusinessReviewDto` and `UpdateBusinessReviewDto`, `body` is marked with `?` but has no `@IsOptional()` → it is effectively required. Also `rating` has no 1–5 constraint.
4. `Order`, `OrderItem`, `StockReservation` models exist in the schema but have no module/route — for a later phase.
5. `ProductsModule` and `FavoriteBusinessModule` are intentionally commented out in `app.module.ts` and meant to be enabled later — don't uncomment them.

## Already done (don't repeat)

- `gh_deploy_key` files were untracked from git and added to `.gitignore`. (User must rotate the key and purge git history.)
- `env.example` was cleared of real values and turned into a full sample.
- JWT secret moved from hardcoded to `JWT_SECRET` in env (with fail-fast).
- `DATABASE_HOST`/`DATABASE_PORT` added to env and to both connection paths.
- Review create/edit access in `business-review` was opened to `User, Owner, Admin` (ownership is still checked in the service).
- `PROJECT_DOCUMENTATION.md` was rewritten.
- The `USER` role was fully removed (enum, all `@Roles`, seed, and DB via migration).
- Review approval flow was added: `isApproved`/`approvedAt` on `BusinessReview`, management list `GET /reviews`, and `PATCH /reviews/:id/status`.
- `reviewsAverage` / `reviewsCount` added to all business lists (`BusinessService.listBusinesses`, `getFavorites`, and `CategoriesService` lists). The four methods `findAll/findByStatus/findPerOwner/findPerOwnerByStatus` were unified onto the private `listBusinesses` helper.
- `business-report` module added: `BusinessReport` model + `BusinessReportType` (`INCORRECT_INFO`/`BUSINESS_CLOSED`/`DUPLICATE`/`OTHER`) & `BusinessReportStatus` (`PENDING`/`RESOLVED`/`REJECTED`) enums, migration `20260902150406_add_business_report`. Public `POST /business-reports`; ADMIN sees all, OWNER only reports for their own businesses (`NOT_YOUR_BUSINESS_REPORT`). `description` is required for `INCORRECT_INFO`/`OTHER` only (`@ValidateIf`). On create, `SmsService.sendBusinessReportNotice` texts the owner — best-effort, swallows errors since SMS isn't fully wired.
- Review approval upgraded from the `isApproved` boolean to a 3-state `BusinessReviewStatus` enum (`PENDING`/`APPROVED`/`REJECTED`) on `BusinessReview` — migration `20260902160000_review_status_enum` (adds `status`, backfills `isApproved=true` → `APPROVED`, drops `isApproved`). `setApproval` → `setStatus`; `UpdateReviewStatusDto`/`ListBusinessReviewsDto` now use `status` (was `isApproved`). Every public stat/list still filters `status: 'APPROVED'`. `scripts/seed-fake.ts` updated to emit `status`.
- Rate limiting added via `@nestjs/throttler`: global `ThrottlerModule.forRoot` (300 req/min per IP) + global `ThrottlerGuard` (`APP_GUARD` in `app.module.ts`). Strict per-route `@Throttle` overrides: `auth/send-phone` 5/10min, `auth/verify-code` 10/10min, `POST /feedback` and `POST /business-reports` 5/10min. `main.ts` sets `trust proxy` (1) so the client IP is read correctly behind the cPanel proxy. (No CAPTCHA yet — deferred; throttler only.)
- `blog` module added — public content section (`src/blog/`). Models `BlogCategory` + `BlogPost` + enum `BlogPostStatus` (`DRAFT`/`PUBLISHED`), migration `20260904120000_add_blog_module`. Public: `GET /blog` (only `PUBLISHED`, newest first, `categorySlug`/`search` filters, list rows omit `content`, response `{ posts, page: { total, take, skip } }`), `GET /blog/categories`, `GET /blog/:idOrSlug` (`OptionalAuthGuard`; resolves by slug **then** id so the admin edit form can load a post by its uuid; DRAFT → 404 unless admin; `viewCount` bumped fire-and-forget for non-admin viewers only). Admin (`AuthGuard, RolesGuard` + `@Roles(Role.Admin)`): `POST/PATCH/DELETE /blog`, `POST/PATCH/DELETE /blog/categories/:id`, `POST /blog/upload-cover` (field `file`, `jpeg|jpg|png|webp`, 5MB, → `{ url }`, scope `blog`). Slug auto-generated from title if not sent (`src/blog/slug.util.ts` — Persian translit + numeric-suffix dedupe + uuid fallback); `readTimeMinutes` auto = ceil(words/200), min 1; `publishedAt` set on first DRAFT→PUBLISHED. `content` is sanitized server-side with `sanitize-html` (`src/blog/content.util.ts`, allowlist p/h2-h4/strong/em/ul/ol/li/a/img/blockquote/br). Deleting a category with posts → 400 `BLOG_CATEGORY_HAS_POSTS` (no cascade). `sanitize-html` is pinned to `~2.13.1` on purpose — 2.14+ pulls ESM-only `htmlparser2@10` which breaks the jest transform.
- `blog` admin listing added — `GET /blog/admin` (`AuthGuard, RolesGuard` + `@Roles(Role.Admin)`, same guard as `POST /blog`). Returns posts in **all** statuses (so the panel can see DRAFTs), ordered `createdAt` desc, same `LIST_SELECT` (omits `content`, includes `category {id,name,slug}`, `viewCount`, `status`, `createdAt`, `updatedAt`) and same `{ posts, page: { total, take, skip } }` shape as `GET /blog`; `total` is the filtered count. New DTO `QueryBlogAdminPostsDto` (`src/blog/dto/query-blog-admin-posts.dto.ts`): `take` (1–50, def 10), `skip` (def 0), `search` (title/excerpt), `status` (`@IsEnum(BlogPostStatus)`, optional = all), `categoryId` (`@IsUUID`, optional) — `status`/`categoryId` are whitelisted so `forbidNonWhitelisted` accepts them. Public `GET /blog` is unchanged (still PUBLISHED-only). Also: `CreateBlogPostDto` now gates `excerpt`/`content`/`authorName` strict validation behind `@ValidateIf(status === PUBLISHED)` — a DRAFT only requires `title`; `BlogService.create` defaults the missing text fields to `''`.
