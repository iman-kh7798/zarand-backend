import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';

/** فیلدهای عمومی دسته‌بندی که در پاسخ‌ها برگردانده می‌شوند */
const CATEGORY_SELECT = { id: true, name: true, slug: true } as const;

@Injectable()
export class BlogCategoryService {
  constructor(private prisma: PrismaService) {}

  /** همه‌ی دسته‌بندی‌های بلاگ — عمومی */
  findAll() {
    return this.prisma.blogCategory.findMany({
      select: CATEGORY_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateBlogCategoryDto) {
    try {
      return await this.prisma.blogCategory.create({
        data: { name: dto.name, slug: dto.slug },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: string, dto: UpdateBlogCategoryDto) {
    try {
      return await this.prisma.blogCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * حذف دسته‌بندی. اگر هنوز مقاله‌ای به آن وصل باشد خطا می‌دهد
   * (مقالات cascade حذف نمی‌شوند).
   */
  async remove(id: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });
    if (!category) throw new NotFoundException('BLOG_CATEGORY_NOT_FOUND');
    if (category._count.posts > 0) {
      throw new BadRequestException('BLOG_CATEGORY_HAS_POSTS');
    }

    await this.prisma.blogCategory.delete({ where: { id } });
    return { message: 'Blog category deleted successfully' };
  }

  /** نگاشت خطاهای شناخته‌شده‌ی Prisma به خطاهای HTTP با کد UPPER_SNAKE */
  private mapError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        return new ConflictException('SLUG_ALREADY_IN_USE');
      if (error.code === 'P2025') {
        return new NotFoundException('BLOG_CATEGORY_NOT_FOUND');
      }
    }
    return error as Error;
  }
}
