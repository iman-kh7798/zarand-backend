import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { OptionalAuthGuard } from 'src/auth/optional.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { UploadService } from 'src/upload/upload.service';
import { BlogService } from './blog.service';
import { BlogCategoryService } from './blog-category.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import { QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import { QueryBlogAdminPostsDto } from './dto/query-blog-admin-posts.dto';

const BLOG_SCOPE = 'blog';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly blogCategoryService: BlogCategoryService,
    private readonly uploadService: UploadService,
  ) {}

  // ---------------------------------------------------------------------------
  // عمومی
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'لیست مقالات منتشرشده (عمومی)',
    description:
      'فقط مقالات با وضعیت PUBLISHED، به ترتیب جدیدترین. قابل فیلتر با ' +
      '`categorySlug` و `search` (روی عنوان یا خلاصه). فیلد `content` در پاسخ ' +
      'لیست برنمی‌گردد. خروجی: `{ posts, page: { total, take, skip } }`.',
  })
  @ApiOkResponse({ description: 'صفحه‌ای از مقالات منتشرشده' })
  @Get()
  list(@Query() query: QueryBlogPostsDto) {
    return this.blogService.list(query);
  }

  @ApiOperation({
    summary: 'لیست دسته‌بندی‌های بلاگ (عمومی)',
    description: 'همه‌ی دسته‌بندی‌ها با فیلدهای id، name و slug.',
  })
  @ApiOkResponse({ description: 'آرایه‌ی دسته‌بندی‌ها' })
  @Get('categories')
  listCategories() {
    return this.blogCategoryService.findAll();
  }

  // ---------------------------------------------------------------------------
  // ادمین — دسته‌بندی‌ها
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'ساخت دسته‌بندی بلاگ (فقط ADMIN)',
    description: '`slug` فقط حروف کوچک لاتین، رقم و خط تیره.',
  })
  @ApiCreatedResponse({ description: 'دسته‌بندی ساخته‌شده' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('categories')
  createCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.blogCategoryService.create(dto);
  }

  @ApiOperation({ summary: 'ویرایش دسته‌بندی بلاگ (فقط ADMIN)' })
  @ApiParam({ name: 'id', description: 'شناسه‌ی دسته‌بندی' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateBlogCategoryDto) {
    return this.blogCategoryService.update(id, dto);
  }

  @ApiOperation({
    summary: 'حذف دسته‌بندی بلاگ (فقط ADMIN)',
    description:
      'اگر هنوز مقاله‌ای به این دسته‌بندی وصل باشد با خطای ' +
      '`BLOG_CATEGORY_HAS_POSTS` (۴۰۰) رد می‌شود؛ مقالات cascade حذف نمی‌شوند.',
  })
  @ApiParam({ name: 'id', description: 'شناسه‌ی دسته‌بندی' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.blogCategoryService.remove(id);
  }

  // ---------------------------------------------------------------------------
  // ادمین — آپلود تصویر کاور
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'آپلود تصویر کاور مقاله (فقط ADMIN)',
    description:
      'فرمت‌های مجاز: jpg / png / webp، حداکثر ۵ مگابایت. خروجی: ' +
      '`{ url }` که در بدنه‌ی ساخت/ویرایش مقاله به‌عنوان `coverImage` فرستاده می‌شود.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: '/uploads/blog/2026/09/04/17...-cover.jpg',
        },
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('upload-cover')
  @UseInterceptors(FileInterceptor('file'))
  uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5_000_000 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const upload = this.uploadService.create(file, {
      scope: BLOG_SCOPE,
      date: new Date(),
    });
    return { url: upload.path };
  }

  // ---------------------------------------------------------------------------
  // ادمین — مقالات
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'لیست مدیریتی مقالات — همه‌ی وضعیت‌ها (فقط ADMIN)',
    description:
      'برخلاف `GET /blog` عمومی، این مسیر مقالات DRAFT و PUBLISHED را با هم ' +
      'برمی‌گرداند تا پنل مدیریت بتواند پیش‌نویس‌ها را هم ببیند. به‌ترتیب ' +
      'جدیدترین بر اساس `createdAt`. قابل فیلتر با `status` (DRAFT|PUBLISHED)، ' +
      '`categoryId` و `search` (روی عنوان یا خلاصه). خروجی دقیقاً هم‌شکل ' +
      '`GET /blog`: `{ posts, page: { total, take, skip } }` که در آن `total` ' +
      'تعداد کل با اعمال فیلترهاست.',
  })
  @ApiOkResponse({ description: 'صفحه‌ای از مقالات در همه‌ی وضعیت‌ها' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin')
  listForAdmin(@Query() query: QueryBlogAdminPostsDto) {
    return this.blogService.listForAdmin(query);
  }

  @ApiOperation({
    summary: 'ساخت مقاله (فقط ADMIN)',
    description:
      'اگر `slug` فرستاده نشود از روی `title` ساخته می‌شود. اگر ' +
      '`readTimeMinutes` ندهید از طول متن تخمین زده می‌شود (حداقل ۱). با ' +
      'وضعیت PUBLISHED مقدار `publishedAt` همان لحظه ست می‌شود. متن `content` ' +
      'سمت سرور sanitize می‌شود.',
  })
  @ApiCreatedResponse({ description: 'مقاله‌ی ساخته‌شده به‌همراه دسته‌بندی' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto);
  }

  @ApiOperation({
    summary: 'ویرایش مقاله (فقط ADMIN)',
    description:
      'اولین باری که وضعیت از DRAFT به PUBLISHED تغییر کند و `publishedAt` ' +
      'خالی باشد، همان لحظه ست می‌شود.',
  })
  @ApiParam({ name: 'id', description: 'شناسه‌ی مقاله' })
  @ApiOkResponse({ description: 'مقاله‌ی به‌روزشده' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @ApiOperation({ summary: 'حذف مقاله (فقط ADMIN)' })
  @ApiParam({ name: 'id', description: 'شناسه‌ی مقاله' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Blog post deleted successfully' },
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }

  // ---------------------------------------------------------------------------
  // عمومی — یک مقاله بر اساس slug یا id (با بررسی اختیاری توکن برای دیدن پیش‌نویس)
  // این مسیر آخر تعریف می‌شود تا مسیرهای ثابت بالا را نگیرد.
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'دریافت یک مقاله بر اساس slug یا id (عمومی)',
    description:
      'مقاله‌ی کامل به‌همراه `content` و دسته‌بندی. پارامتر می‌تواند `slug` یا ' +
      '`id` باشد (اول با slug، بعد با id جست‌وجو می‌شود) تا پنل مدیریت برای فرم ' +
      'ویرایش هم بتواند مقاله را با شناسه بگیرد. مقاله‌ی DRAFT برای کاربر ' +
      'عادی/ناشناس ۴۰۴ می‌دهد و فقط با توکن ADMIN دیده می‌شود (توکن اختیاری ' +
      'است). هر فراخوانی موفقِ غیرادمین، `viewCount` را یکی زیاد می‌کند.',
  })
  @ApiParam({ name: 'idOrSlug', description: 'اسلاگ یا شناسه‌ی یکتای مقاله' })
  @ApiOkResponse({ description: 'مقاله‌ی کامل' })
  @ApiBearerAuth('access-token')
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Get(':idOrSlug')
  findOne(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: { user?: { sub: string; role: Role } },
  ) {
    return this.blogService.findOne(idOrSlug, req.user);
  }
}
