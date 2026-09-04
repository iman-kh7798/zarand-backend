import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessReportStatus,
  NotificationAudience,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';
import { SmsService } from 'src/sms/sms.service';
import { CreateBusinessReportDto } from './dto/create-business-report.dto';
import { ListBusinessReportsDto } from './dto/list-business-reports.dto';
import { NotificationService } from 'src/notification/notification.service';
import { notificationTemplates } from 'src/notification/notification.templates';

/**
 * فاصله‌ی حداقلی بین دو پیامکِ «گزارش جدید» به ادمین (دقیقه).
 * اعلان درون‌برنامه‌ای همیشه ساخته می‌شود؛ فقط پیامک محدود می‌شود تا
 * چند گزارش پشت‌سرهم، ادمین را با پیامک اسپم نکند (مکمل throttler).
 */
const ADMIN_REPORT_SMS_COOLDOWN_MIN = Number(
  process.env.NOTIFICATION_REPORT_SMS_COOLDOWN_MIN ?? 30,
);

/** اطلاعات کاربری که درخواست را زده — از payload توکن می‌آید */
type Actor = { sub: string; role: Role };

@Injectable()
export class BusinessReportService {
  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private notificationService: NotificationService,
  ) {}

  // ثبت گزارش جدید از فرم عمومی سایت — بدون نیاز به لاگین
  async create(dto: CreateBusinessReportDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      select: { id: true, title: true, owner: { select: { phone: true } } },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');

    const report = await this.prisma.businessReport.create({
      data: {
        businessId: dto.businessId,
        type: dto.type,
        description: dto.description?.trim() || null,
      },
    });

    // به مالک کسب‌وکار پیامک اطلاع‌رسانی می‌رود (best-effort — خطا مانع ثبت نمی‌شود)
    if (business.owner?.phone) {
      this.sms.sendBusinessReportNotice(business.owner.phone, business.title);
    }

    // اعلان برای ادمین‌ها؛ پیامکش با cooldown محدود شده است
    const content = notificationTemplates.BUSINESS_REPORT_CREATED(
      business.title,
    );
    await this.notificationService.notify({
      type: NotificationType.BUSINESS_REPORT_CREATED,
      audience: NotificationAudience.ADMINS,
      businessId: business.id,
      sendSms: true,
      smsCooldownMinutes: ADMIN_REPORT_SMS_COOLDOWN_MIN,
      data: { businessId: business.id, reportId: report.id },
      ...content,
    });

    return report;
  }

  /**
   * لیست گزارش‌ها برای پنل مدیریت.
   * ادمین گزارش همه‌ی کسب‌وکارها را می‌بیند، مالک فقط گزارش کسب‌وکارهای خودش را.
   */
  async findAll(actor: Actor, query: ListBusinessReportsDto) {
    const take = query.take ? +query.take : 10;
    const skip = query.skip ? +query.skip : 0;

    // مالک فقط گزارش کسب‌وکارهای خودش را می‌بیند — این محدودیت همیشه AND می‌شود
    const businessScope: Prisma.BusinessWhereInput = {};
    if (actor.role !== Role.Admin) {
      businessScope.ownerId = actor.sub;
    }

    const where: Prisma.BusinessReportWhereInput = {
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isRead !== undefined
        ? { isRead: query.isRead === 'true' }
        : {}),
      ...(Object.keys(businessScope).length ? { business: businessScope } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search } },
              { business: { title: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.businessReport.count({ where }),
      this.prisma.businessReport.findMany({
        where,
        take,
        skip,
        ...(query.lastId ? { cursor: { id: query.lastId } } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, title: true, ownerId: true } },
        },
      }),
    ]);

    return { items, page: { total, take, skip } };
  }

  // مشاهده یک گزارش — مالک فقط گزارش کسب‌وکار خودش
  async findOne(id: string, actor: Actor) {
    const report = await this.prisma.businessReport.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, title: true, ownerId: true } },
      },
    });
    if (!report) throw new NotFoundException('BUSINESS_REPORT_NOT_FOUND');
    this.assertCanManage(report.business.ownerId, actor);
    return report;
  }

  // تغییر وضعیت رسیدگی — مالک فقط گزارش کسب‌وکار خودش
  async setStatus(id: string, status: BusinessReportStatus, actor: Actor) {
    const report = await this.prisma.businessReport.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!report) throw new NotFoundException('BUSINESS_REPORT_NOT_FOUND');
    this.assertCanManage(report.business.ownerId, actor);

    return this.prisma.businessReport.update({
      where: { id },
      data: { status },
      include: {
        business: { select: { id: true, title: true, ownerId: true } },
      },
    });
  }

  // علامت‌گذاری خوانده‌شده / خوانده‌نشده — مالک فقط گزارش کسب‌وکار خودش
  async setRead(id: string, isRead: boolean, actor: Actor) {
    const report = await this.prisma.businessReport.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!report) throw new NotFoundException('BUSINESS_REPORT_NOT_FOUND');
    this.assertCanManage(report.business.ownerId, actor);

    return this.prisma.businessReport.update({
      where: { id },
      data: { isRead },
    });
  }

  // حذف گزارش — فقط ادمین (کنترلر با Roles محدود کرده)
  async remove(id: string) {
    try {
      await this.prisma.businessReport.delete({ where: { id } });
      return { success: true };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('BUSINESS_REPORT_NOT_FOUND');
      }
      throw e;
    }
  }

  /** مالک فقط به گزارش کسب‌وکارهای خودش دسترسی دارد؛ ادمین به همه */
  private assertCanManage(businessOwnerId: string, actor: Actor) {
    if (actor.role !== Role.Admin && businessOwnerId !== actor.sub) {
      throw new ForbiddenException('NOT_YOUR_BUSINESS_REPORT');
    }
  }
}
