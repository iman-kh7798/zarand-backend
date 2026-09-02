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

**11. Review approval flow:** `BusinessReview.isApproved` defaults to `false`. A new review — and every **edit** of a review — goes back to pending (`isApproved: false`, `approvedAt: null`). Only the `OWNER` of the related business and `ADMIN` can approve. Every query that returns public review stats or lists **must** filter `isApproved: true`.

**12. Review stats in business lists:** wherever a list of businesses is returned it must also include `reviewsAverage` and `reviewsCount`. Use `BusinessReviewService.withStats(rows)` (or `getStatsFor(ids)` for nested structures) — it works with one `groupBy` for the whole list, so don't call it inside a `map`. If you add a new list, do the same for it.

**13. Never return `passwordHash`** — it is stripped via destructuring in `users.service`.

## Database / Prisma

- `prisma/schema.prisma` — `datasource db` has **no `url`**; the connection goes through the `@prisma/adapter-mariadb` driver adapter in `PrismaService` using env vars `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`. `DATABASE_URL` is only needed for the CLI (in `prisma.config.ts`).
  - Both paths (`PrismaService` and `seed.ts`) fall back to `localhost:3306`. Make sure `DATABASE_URL` and `DATABASE_HOST` point to the same server.
- Models: `Role, User, Business, BusinessSocialLink, FavoriteBusiness, Category, Product, ProductImage, BusinessImage, ProductVariant, Order, OrderItem, Review, BusinessReview, StockReservation, AuditLog, Otp`.
  - Order/cart (`Order`, `OrderItem`, `StockReservation`) exist in the schema but have **no module/route**.
- Keys: `String @db.Char(36)` with `uuid()`; `Role.id` is an integer (1=ADMIN, 2=OWNER, 3=USER per `seed.ts`).
- `Business.status`: `PENDING | APPROVED | REJECTED`. Anonymous users only see `APPROVED`.
- After a schema change: `npx prisma migrate dev --name ...` then `npm run generate`.
- Migrations: `0_init` and `20260827120000_review_approval_and_remove_user_role`.
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
| `reviews/:id/status`                                                                 | PATCH                | OWNER (own business) / ADMIN — approve or reject                   |
| `reviews/:id`                                                                        | PUT / DELETE         | only the review's own author                                       |
| `categories`, `categories/:id`, `categories/slug/:slug`, `categories/:id/businesses` | GET                  | public                                                             |
| `categories` (POST/PATCH/DELETE), `categories/business/set`                          | —                    | ADMIN (setting a category: ADMIN+OWNER)                            |
| `users` CRUD                                                                         | —                    | ADMIN; `users/profile` (GET/POST) for all logged-in users          |
| `role`                                                                               | GET                  | ADMIN                                                              |
| `favorite-businesses/*`                                                              | —                    | logged in (module not registered)                                  |
| `products/*`, `product-image/*`                                                      | —                    | **inactive** (module commented out in app.module)                  |

## Auth (OTP flow)

`send-phone` → a 6-digit code is stored in the `Otp` table and texted → `verify-code` → if the user didn't exist they are created (`roleId: 2` = OWNER) and `{ access_token, isNewUser }` is returned.
Test phone numbers in `auth.service.ts` (`testPhone`) work with the fixed code `123456` and no SMS.

Token secret and expiry come from env (`JWT_SECRET` is required — the app fails to start without it — and `JWT_EXPIRES_IN` defaults to `3600s`). Both are read in `src/auth/constants.ts`.

## Deploy

`.github/workflows/deploy.yml` — on push to `dev`: build, then rsync `dist/` + `package.json` to cPanel over SSH and `touch tmp/restart.txt`. So **the code must build or the deploy breaks** → always run `npm run build` before committing to `dev`.

## Test status (baseline)

`npm test` currently has **4 suites / 45 tests failing** and 21 passing — this predates my changes and is unrelated. Main cause: `Nest can't resolve dependencies` in specs (e.g. `categories.controller.spec.ts`). When evaluating my own changes, treat this number as the baseline and only check that it didn't get worse.

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
