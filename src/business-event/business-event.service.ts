import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessEventType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessEventDto } from './dto/create-business-event.dto';
import { BusinessEventStatsRange } from './dto/business-event-stats-query.dto';

/** برای دیدوپلیکیت: در همین بازه یک visitor فقط یک رویداد از هر نوع حساب می‌شود */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** برای range=all سقف طول سری روزانه تا از حجم پاسخ نامحدود جلوگیری شود؛ totals سقف نمی‌خورد */
const ALL_TIME_SERIES_DAYS = 90;

type TypeCounts = {
  profileView: number;
  phoneClick: number;
  socialClick: number;
};

@Injectable()
export class BusinessEventService {
  constructor(private prisma: PrismaService) {}

  // ثبت رویداد از پروفایل عمومی کسب‌وکار — بدون نیاز به لاگین
  async create(businessId: string, dto: CreateBusinessEventDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');

    // اگر همین visitor همین نوع رویداد را در ۲۴ ساعت اخیر ثبت کرده، از insert صرف‌نظر می‌شود
    const duplicate = await this.prisma.businessEvent.findFirst({
      where: {
        businessId,
        visitorId: dto.visitorId,
        type: dto.type,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (duplicate) return { success: true };

    await this.prisma.businessEvent.create({
      data: {
        businessId,
        type: dto.type,
        meta: dto.meta as Prisma.InputJsonValue | undefined,
        visitorId: dto.visitorId,
      },
    });
    return { success: true };
  }

  /**
   * آمار کسب‌وکار خودِ مالک — businessId از روی توکن resolve می‌شود، نه پارامتر
   * (هر مالک فقط اجازه‌ی یک کسب‌وکار دارد؛ رجوع کنید به BusinessService.create).
   * `totals` = مجموع هر نوع در بازه؛ برای `all` کل تاریخچه است (بدون سقف).
   * `series` = شمارش روزانه با محور زمانی پیوسته (روزهای بدون رویداد هم صفر برمی‌گردند)،
   * برای `all` به آخرین ۹۰ روز محدود می‌شود تا حجم پاسخ نامحدود نشود.
   */
  async getMyStats(
    ownerId: string,
    range: BusinessEventStatsRange | undefined,
  ) {
    const business = await this.prisma.business.findFirst({
      where: { ownerId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');

    const days =
      range === '7d' ? 7 : range === '30d' ? 30 : ALL_TIME_SERIES_DAYS;
    const todayUtc = this.startOfUtcDay(new Date());
    const seriesStart = new Date(todayUtc.getTime() - (days - 1) * DAY_MS);
    // برای ۷د/۳۰د totals هم به همین بازه محدود می‌شود؛ برای all کل تاریخچه (بدون سقف ۹۰ روزه‌ی series)
    const totalsSince = range === '7d' || range === '30d' ? seriesStart : null;

    const [totalsGrouped, rows] = await Promise.all([
      this.prisma.businessEvent.groupBy({
        by: ['type'],
        where: {
          businessId: business.id,
          ...(totalsSince ? { createdAt: { gte: totalsSince } } : {}),
        },
        _count: { _all: true },
      }),
      this.prisma.businessEvent.findMany({
        where: { businessId: business.id, createdAt: { gte: seriesStart } },
        select: { type: true, createdAt: true },
      }),
    ]);

    return {
      totals: this.toTypeCounts(totalsGrouped),
      series: this.buildSeries(rows, seriesStart, days),
    };
  }

  private buildSeries(
    rows: { type: BusinessEventType; createdAt: Date }[],
    seriesStart: Date,
    days: number,
  ) {
    const buckets = new Map<string, TypeCounts>();
    for (let i = 0; i < days; i++) {
      const date = this.toDateKey(new Date(seriesStart.getTime() + i * DAY_MS));
      buckets.set(date, this.emptyCounts());
    }
    for (const row of rows) {
      const bucket = buckets.get(this.toDateKey(row.createdAt));
      if (!bucket) continue; // خارج از بازه (نباید پیش بیاید چون کوئری همین بازه را فیلتر کرده)
      this.incrementCount(bucket, row.type);
    }
    return Array.from(buckets, ([date, counts]) => ({ date, ...counts }));
  }

  private toTypeCounts(
    grouped: { type: BusinessEventType; _count: { _all: number } }[],
  ): TypeCounts {
    const counts = this.emptyCounts();
    for (const row of grouped) {
      counts[this.fieldFor(row.type)] = row._count._all;
    }
    return counts;
  }

  private incrementCount(counts: TypeCounts, type: BusinessEventType) {
    counts[this.fieldFor(type)]++;
  }

  private fieldFor(type: BusinessEventType): keyof TypeCounts {
    if (type === BusinessEventType.PROFILE_VIEW) return 'profileView';
    if (type === BusinessEventType.PHONE_CLICK) return 'phoneClick';
    return 'socialClick';
  }

  private emptyCounts(): TypeCounts {
    return { profileView: 0, phoneClick: 0, socialClick: 0 };
  }

  private toDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }
}
