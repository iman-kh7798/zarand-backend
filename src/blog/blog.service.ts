import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogPostStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import { QueryBlogAdminPostsDto } from './dto/query-blog-admin-posts.dto';
import { estimateReadTimeMinutes, sanitizeContent } from './content.util';
import { generateUniqueSlug } from './slug.util';

/**
 * فیلدهای مقاله در حالت «لیست» — عمداً `content` را برنمی‌گرداند تا پاسخ سبک بماند.
 */
const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  authorName: true,
  authorRole: true,
  authorAvatar: true,
  readTimeMinutes: true,
  status: true,
  publishedAt: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.BlogPostSelect;

type Viewer = { sub: string; role: Role };

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  /**
   * لیست عمومی مقالات — فقط منتشرشده‌ها، جدیدترین اول.
   * قابل فیلتر بر اساس slug دسته‌بندی و جست‌وجوی متنی روی عنوان/خلاصه.
   */
  async list(query: QueryBlogPostsDto) {
    const take = query.take ?? 10;
    const skip = query.skip ?? 0;

    const where: Prisma.BlogPostWhereInput = {
      status: BlogPostStatus.PUBLISHED,
      ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { excerpt: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, posts] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        take,
        skip,
        orderBy: { publishedAt: 'desc' },
        select: LIST_SELECT,
      }),
    ]);

    return { posts, page: { total, take, skip } };
  }

  /**
   * لیست مدیریتی مقالات — همه‌ی وضعیت‌ها (DRAFT و PUBLISHED)، جدیدترین اول
   * بر اساس `createdAt`. قابل فیلتر با `status`، `categoryId` و جست‌وجوی متنی
   * روی عنوان/خلاصه. خروجی هم‌شکل با لیست عمومی: `{ posts, page }`.
   */
  async listForAdmin(query: QueryBlogAdminPostsDto) {
    const take = query.take ?? 10;
    const skip = query.skip ?? 0;

    const where: Prisma.BlogPostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { excerpt: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, posts] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: LIST_SELECT,
      }),
    ]);

    return { posts, page: { total, take, skip } };
  }

  /**
   * یک مقاله‌ی کامل بر اساس `slug` یا `id` (شامل `content` و دسته‌بندی).
   * ابتدا با `slug` و اگر پیدا نشد با `id` جست‌وجو می‌شود؛ این‌طوری پنل مدیریت
   * می‌تواند برای فرم ویرایش، مقاله را با شناسه‌ی پایدارش هم بگیرد.
   * مقاله‌ی پیش‌نویس فقط برای ادمین قابل مشاهده است؛ برای بقیه 404.
   * `viewCount` فقط برای بازدیدکننده‌ی غیرادمین و به‌صورت fire-and-forget زیاد می‌شود.
   */
  async findOne(idOrSlug: string, viewer?: Viewer) {
    const include = { category: true } as const;
    const post =
      (await this.prisma.blogPost.findUnique({
        where: { slug: idOrSlug },
        include,
      })) ??
      (await this.prisma.blogPost.findUnique({
        where: { id: idOrSlug },
        include,
      }));

    const isAdmin = viewer?.role === Role.Admin;
    if (!post || (post.status === BlogPostStatus.DRAFT && !isAdmin)) {
      throw new NotFoundException('BLOG_POST_NOT_FOUND');
    }

    // بازدیدِ ادمین (مثلاً باز کردن فرم ویرایش) در آمار حساب نمی‌شود
    if (!isAdmin) {
      void this.prisma.blogPost
        .update({
          where: { id: post.id },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => undefined);
    }

    return post;
  }

  async create(dto: CreateBlogPostDto) {
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);

    // در حالت پیش‌نویس فقط `title` اجباری است؛ بقیه‌ی فیلدهای متنی می‌توانند
    // خالی باشند و اینجا به مقدار پیش‌فرض ('') پر می‌شوند تا اسکیما نشکند.
    const content = sanitizeContent(dto.content ?? '');
    const slug = await generateUniqueSlug(
      dto.slug?.trim() || dto.title,
      (candidate) =>
        this.prisma.blogPost
          .count({ where: { slug: candidate } })
          .then((c) => c > 0),
    );
    const status = dto.status ?? BlogPostStatus.DRAFT;

    try {
      return await this.prisma.blogPost.create({
        data: {
          title: dto.title,
          slug,
          excerpt: dto.excerpt ?? '',
          content,
          coverImage: dto.coverImage ?? null,
          authorName: dto.authorName ?? '',
          authorRole: dto.authorRole ?? null,
          authorAvatar: dto.authorAvatar ?? null,
          readTimeMinutes:
            dto.readTimeMinutes ?? estimateReadTimeMinutes(content),
          status,
          publishedAt: status === BlogPostStatus.PUBLISHED ? new Date() : null,
          ...(dto.categoryId
            ? { category: { connect: { id: dto.categoryId } } }
            : {}),
        },
        include: { category: true },
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('BLOG_POST_NOT_FOUND');

    const data: Prisma.BlogPostUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.content !== undefined) data.content = sanitizeContent(dto.content);
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage;
    if (dto.authorName !== undefined) data.authorName = dto.authorName;
    if (dto.authorRole !== undefined) data.authorRole = dto.authorRole;
    if (dto.authorAvatar !== undefined) data.authorAvatar = dto.authorAvatar;
    if (dto.readTimeMinutes !== undefined) {
      data.readTimeMinutes = dto.readTimeMinutes;
    }

    if (dto.slug !== undefined && dto.slug.trim()) {
      data.slug = await generateUniqueSlug(dto.slug.trim(), (candidate) =>
        this.prisma.blogPost
          .count({ where: { slug: candidate, id: { not: id } } })
          .then((c) => c > 0),
      );
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        await this.assertCategoryExists(dto.categoryId);
        data.category = { connect: { id: dto.categoryId } };
      } else {
        data.category = { disconnect: true };
      }
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      // اولین بار که DRAFT → PUBLISHED می‌شود، تاریخ انتشار ست می‌شود
      if (
        dto.status === BlogPostStatus.PUBLISHED &&
        existing.publishedAt === null
      ) {
        data.publishedAt = new Date();
      }
    }

    try {
      return await this.prisma.blogPost.update({
        where: { id },
        data,
        include: { category: true },
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.blogPost.delete({ where: { id } });
      return { message: 'Blog post deleted successfully' };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private async assertCategoryExists(categoryId: string) {
    const count = await this.prisma.blogCategory.count({
      where: { id: categoryId },
    });
    if (count === 0) throw new NotFoundException('BLOG_CATEGORY_NOT_FOUND');
  }

  /** نگاشت خطاهای شناخته‌شده‌ی Prisma به خطاهای HTTP با کد UPPER_SNAKE */
  private mapError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        return new ConflictException('SLUG_ALREADY_IN_USE');
      if (error.code === 'P2025') {
        return new NotFoundException('BLOG_POST_NOT_FOUND');
      }
      if (error.code === 'P2003') {
        return new NotFoundException('BLOG_CATEGORY_NOT_FOUND');
      }
    }
    return error as Error;
  }
}
