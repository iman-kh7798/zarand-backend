import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessReviewStatus,
  NotificationAudience,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { UpdateBusinessReviewDto } from './dto/update-business-review.dto';
import { ListBusinessReviewsDto } from './dto/list-business-reviews.dto';
import { NotificationService } from 'src/notification/notification.service';
import { notificationTemplates } from 'src/notification/notification.templates';

/** اطلاعات کاربری که درخواست را زده — از payload توکن می‌آید */
type Actor = { sub: string; role: Role };

@Injectable()
export class BusinessReviewService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createOrUpdate(
    businessId: string,
    userId: string,
    dto: CreateBusinessReviewDto,
  ) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, title: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');

    // ---- حالت «پاسخ» به یک نظر موجود ----
    if (dto.parentId) {
      const parent = await this.prisma.businessReview.findUnique({
        where: { id: dto.parentId },
        select: { id: true, businessId: true, parentId: true },
      });
      if (!parent || parent.businessId !== businessId) {
        throw new NotFoundException('PARENT_REVIEW_NOT_FOUND');
      }
      // فقط یک سطح: نمی‌توان به یک پاسخ، پاسخ داد
      if (parent.parentId) {
        throw new BadRequestException('MAX_REPLY_DEPTH_EXCEEDED');
      }
      if (!dto.body?.trim()) throw new BadRequestException('BODY_REQUIRED');

      // مالک کسب‌وکار هم مجاز است به نظرها پاسخ بدهد
      const reply = await this.prisma.businessReview.create({
        data: {
          body: dto.body,
          businessId,
          userId,
          parentId: parent.id,
        },
      });
      await this.notifyOwner(business, userId, true);
      return reply;
    }

    // ---- حالت نظر ریشه ----
    if (business.ownerId === userId) {
      throw new ForbiddenException('CANNOT_REVIEW_OWN_BUSINESS');
    }
    if (dto.rating == null) throw new BadRequestException('RATING_REQUIRED');

    // هر کاربر فقط یک نظر ریشه به‌ازای هر کسب‌وکار دارد
    const existing = await this.prisma.businessReview.findFirst({
      where: { businessId, userId, parentId: null },
      select: { id: true },
    });
    if (existing) {
      // ویرایش نظر، آن را دوباره به حالت در انتظار بررسی برمی‌گرداند
      const review = await this.prisma.businessReview.update({
        where: { id: existing.id },
        data: {
          rating: dto.rating,
          body: dto.body,
          status: BusinessReviewStatus.PENDING,
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
    await this.notifyOwner(business, userId, false);
    return review;
  }

  /**
   * اعلان «نظر جدید» برای مالک کسب‌وکار.
   * طبق نیازمندی فقط اعلان درون‌برنامه‌ای است و پیامکی ارسال نمی‌شود.
   * اگر خود مالک نظر/پاسخ گذاشته باشد، اعلانی برای او ساخته نمی‌شود.
   */
  private async notifyOwner(
    business: { id: string; title: string },
    actorId: string,
    isReply: boolean,
  ) {
    const content = notificationTemplates.REVIEW_CREATED(
      business.title,
      isReply,
    );
    await this.notificationService.notify({
      type: NotificationType.REVIEW_CREATED,
      audience: NotificationAudience.BUSINESS_OWNER,
      businessId: business.id,
      sendSms: false,
      excludeUserIds: [actorId],
      data: { businessId: business.id },
      ...content,
    });
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
        // هر ویرایشی نیاز به بررسی مجدد دارد
        status: BusinessReviewStatus.PENDING,
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
    // حذف نظر ریشه، پاسخ‌هایش را هم پاک می‌کند (بدون اتکا به رفتار cascade خودارجاع در MySQL)
    await this.prisma.$transaction([
      this.prisma.businessReview.deleteMany({ where: { parentId: id } }),
      this.prisma.businessReview.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  /**
   * تغییر وضعیت یک نظر (در انتظار بررسی / تاییدشده / رد شده).
   * ادمین به همه‌ی نظرها دسترسی دارد، مالک فقط به نظرهای کسب‌وکار خودش.
   */
  async setStatus(id: string, status: BusinessReviewStatus, actor: Actor) {
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
        status,
        approvedAt:
          status === BusinessReviewStatus.APPROVED ? new Date() : null,
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
   * و وضعیت بررسی (`status`).
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
      ...(query.status ? { status: query.status } : {}),
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
      // فقط نظرهای ریشه‌ی تاییدشده در آمار حساب می‌شوند (پاسخ‌ها rating ندارند)
      where: {
        businessId: { in: businessIds },
        status: BusinessReviewStatus.APPROVED,
        parentId: null,
      },
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
      ? {
          businessId,
          OR: [{ status: BusinessReviewStatus.APPROVED }, { userId: viewerId }],
        }
      : { businessId, status: BusinessReviewStatus.APPROVED };

    const [agg, rows] = await Promise.all([
      this.prisma.businessReview.aggregate({
        // میانگین و تعداد فقط از روی نظرهای ریشه‌ی تاییدشده
        where: {
          businessId,
          status: BusinessReviewStatus.APPROVED,
          parentId: null,
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.businessReview.findMany({
        where,
        // صعودی تا ساخت درخت در حافظه ساده باشد
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, phone: true } } },
      }),
    ]);

    // ساخت درخت دو سطحی (نظر ریشه + پاسخ‌ها) با یک پیمایش O(n) بدون کوئری اضافه
    type Node = (typeof rows)[number] & { replies: Node[] };
    const byId = new Map<string, Node>(
      rows.map((r) => [r.id, { ...r, replies: [] }]),
    );
    const roots: Node[] = [];
    for (const r of rows) {
      const node = byId.get(r.id)!;
      if (r.parentId) {
        byId.get(r.parentId)?.replies.push(node);
      } else {
        roots.push(node);
      }
    }
    // نظرهای ریشه از جدید به قدیم؛ پاسخ‌ها از قدیم به جدید می‌مانند
    roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      count: agg._count._all ?? 0,
      reviews: roots,
    };
  }
}
