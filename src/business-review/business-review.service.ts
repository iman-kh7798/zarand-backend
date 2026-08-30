import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { UpdateBusinessReviewDto } from './dto/update-business-review.dto';
import { ListBusinessReviewsDto } from './dto/list-business-reviews.dto';

/** اطلاعات کاربری که درخواست را زده — از payload توکن می‌آید */
type Actor = { sub: string; role: Role };

@Injectable()
export class BusinessReviewService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(
    businessId: string,
    userId: string,
    dto: CreateBusinessReviewDto,
  ) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    if (business.ownerId === userId) {
      throw new ForbiddenException('CANNOT_REVIEW_OWN_BUSINESS');
    }
    // check if already reviewed
    const existing = await this.prisma.businessReview.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (existing) {
      // ویرایش نظر، آن را دوباره به حالت در انتظار تایید برمی‌گرداند
      const review = await this.prisma.businessReview.update({
        where: { id: existing.id },
        data: {
          rating: dto.rating,
          body: dto.body,
          isApproved: false,
          approvedAt: null,
        },
      });
      return review;
    }

    const review = await this.prisma.businessReview.create({
      data: {
        rating: dto.rating,
        body: dto.body,
        businessId,
        userId,
      },
    });
    return review;
  }

  async update(id: string, userId: string, dto: UpdateBusinessReviewDto) {
    const review = await this.prisma.businessReview.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.userId !== userId) throw new ForbiddenException();
    const updated = await this.prisma.businessReview.update({
      where: { id },
      data: {
        rating: dto.rating ?? review.rating,
        body: dto.body ?? review.body,
        // هر ویرایشی نیاز به تایید مجدد دارد
        isApproved: false,
        approvedAt: null,
      },
    });
    return updated;
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.businessReview.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.userId !== userId) throw new ForbiddenException();
    await this.prisma.businessReview.delete({ where: { id } });
    return { success: true };
  }

  /**
   * تایید یا رد کردن یک نظر.
   * ادمین به همه‌ی نظرها دسترسی دارد، مالک فقط به نظرهای کسب‌وکار خودش.
   */
  async setApproval(id: string, isApproved: boolean, actor: Actor) {
    const review = await this.prisma.businessReview.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');

    if (actor.role !== Role.Admin && review.business.ownerId !== actor.sub) {
      throw new ForbiddenException('NOT_YOUR_BUSINESS_REVIEW');
    }

    return await this.prisma.businessReview.update({
      where: { id },
      data: {
        isApproved,
        approvedAt: isApproved ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        business: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * لیست نظرها برای پنل مدیریت.
   * ادمین نظرهای همه‌ی کسب‌وکارها را می‌بیند، مالک فقط نظرهای کسب‌وکارهای خودش را.
   * قابل فیلتر بر اساس کسب‌وکار (`businessId`)، جست‌وجو روی عنوان کسب‌وکار (`search`)
   * و وضعیت تایید (`isApproved`).
   */
  async listForModeration(actor: Actor, query: ListBusinessReviewsDto) {
    const take = query.take ? +query.take : 10;
    const skip = query.skip ? +query.skip : 0;

    const businessFilter: Prisma.BusinessWhereInput = {};
    if (actor.role !== Role.Admin) {
      businessFilter.ownerId = actor.sub;
    }
    if (query.search) {
      businessFilter.title = { contains: query.search };
    }

    const where: Prisma.BusinessReviewWhereInput = {
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.isApproved !== undefined
        ? { isApproved: query.isApproved === 'true' }
        : {}),
      ...(Object.keys(businessFilter).length
        ? { business: businessFilter }
        : {}),
    };

    const [total, reviews] = await Promise.all([
      this.prisma.businessReview.count({ where }),
      this.prisma.businessReview.findMany({
        where,
        take,
        skip,
        ...(query.lastId ? { cursor: { id: query.lastId } } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          business: { select: { id: true, title: true, ownerId: true } },
        },
      }),
    ]);

    return { reviews, page: { total, take, skip } };
  }

  /**
   * میانگین و تعداد نظرات را برای چند کسب‌وکار با یک کوئری می‌گیرد.
   * فقط نظرهای تاییدشده حساب می‌شوند.
   * خروجی: Map از businessId به { average, count }
   */
  async getStatsFor(businessIds: string[]) {
    const stats = new Map<string, { average: number; count: number }>();
    if (!businessIds.length) return stats;

    const grouped = await this.prisma.businessReview.groupBy({
      by: ['businessId'],
      where: { businessId: { in: businessIds }, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });

    for (const row of grouped) {
      stats.set(row.businessId, {
        average: row._avg.rating ? Number(row._avg.rating.toFixed(2)) : 0,
        count: row._count._all,
      });
    }
    return stats;
  }

  /**
   * به هر کسب‌وکار در لیست، `reviewsAverage` و `reviewsCount` اضافه می‌کند.
   * کسب‌وکار بدون نظرِ تاییدشده مقدار صفر می‌گیرد.
   */
  async withStats<T extends { id: string }>(businesses: T[]) {
    const stats = await this.getStatsFor(businesses.map((b) => b.id));
    return businesses.map((business) => ({
      ...business,
      reviewsAverage: stats.get(business.id)?.average ?? 0,
      reviewsCount: stats.get(business.id)?.count ?? 0,
    }));
  }

  /**
   * لیست عمومی نظرهای یک کسب‌وکار.
   * فقط نظرهای تاییدشده برگردانده می‌شود؛ اگر کاربر لاگین کرده باشد نظر خودش را
   * حتی در حالت در انتظار تایید هم می‌بیند (وگرنه فکر می‌کند ثبت نشده).
   * `average` و `count` همیشه فقط از روی نظرهای تاییدشده حساب می‌شوند.
   */
  async listByBusiness(businessId: string, viewerId?: string) {
    const where: Prisma.BusinessReviewWhereInput = viewerId
      ? { businessId, OR: [{ isApproved: true }, { userId: viewerId }] }
      : { businessId, isApproved: true };

    const [agg, reviews] = await Promise.all([
      this.prisma.businessReview.aggregate({
        where: { businessId, isApproved: true },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.businessReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, phone: true } } },
      }),
    ]);
    return {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      count: agg._count._all ?? 0,
      reviews,
    };
  }
}
