import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationAudience,
  NotificationSmsStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  ListMyNotificationsDto,
  ListNotificationsDto,
} from './dto/list-notifications.dto';

/** اطلاعات کاربری که درخواست را زده — از payload توکن می‌آید */
type Actor = { sub: string; role: Role };

/** ورودی اعلان‌های سیستمی (رویدادها) */
export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  audience: NotificationAudience;
  /** فقط برای audience برابر USERS */
  userIds?: string[];
  /** برای BUSINESS_OWNER / BUSINESS_FAVORITES و همچنین به‌عنوان context */
  businessId?: string;
  sendSms?: boolean;
  smsText?: string;
  data?: Prisma.InputJsonValue;
  /** کاربرانی که نباید اعلان بگیرند (مثلاً خودِ ایجادکننده‌ی رویداد) */
  excludeUserIds?: string[];
  /**
   * ضد اسپم: اگر در این بازه (دقیقه) اعلانِ پیامکیِ هم‌نوع فرستاده شده باشد،
   * این اعلان فقط داخل برنامه ثبت می‌شود و پیامکی نمی‌رود.
   */
  smsCooldownMinutes?: number;
}

/** اندازه‌ی هر دسته در createMany گیرنده‌ها */
const RECIPIENT_CHUNK = 500;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------- رویدادها

  /**
   * اعلان سیستمی. هرگز خطا پرتاب نمی‌کند تا شکست اعلان،
   * جریان اصلی (ثبت کسب‌وکار، نظر، ثبت‌نام و ...) را خراب نکند.
   */
  async notify(input: NotifyInput): Promise<{ id: string } | null> {
    try {
      const sendSms = await this.resolveSmsFlag(input);
      const notification = await this.prisma.notification.create({
        data: {
          type: input.type,
          title: input.title,
          body: input.body,
          audience: input.audience,
          status: NotificationStatus.QUEUED,
          sendSms,
          smsText: sendSms ? (input.smsText ?? null) : null,
          data: input.data ?? Prisma.JsonNull,
          businessId: input.businessId ?? null,
        },
        select: { id: true },
      });
      await this.dispatch(notification.id, {
        userIds: input.userIds,
        excludeUserIds: input.excludeUserIds,
      });
      return notification;
    } catch (e) {
      this.logger.error(`notify(${input.type}) failed`, e as Error);
      return null;
    }
  }

  /**
   * اگر برای این نوع اعلان cooldown تعریف شده باشد و به‌تازگی پیامکی از
   * همان نوع رفته باشد، پیامک این یکی خاموش می‌شود (ادمین اسپم نشود).
   */
  private async resolveSmsFlag(input: NotifyInput): Promise<boolean> {
    if (!input.sendSms) return false;
    if (!input.smsCooldownMinutes) return true;

    const since = new Date(Date.now() - input.smsCooldownMinutes * 60_000);
    const recent = await this.prisma.notification.findFirst({
      where: { type: input.type, sendSms: true, createdAt: { gte: since } },
      select: { id: true },
    });
    return !recent;
  }

  // ------------------------------------------------------------------- پخش

  /**
   * ساخت ردیف گیرنده‌ها. مخاطب فقط یک‌بار به لیست شناسه تبدیل می‌شود و
   * ردیف‌ها با createMany دسته‌ای درج می‌شوند؛ پیامک‌ها در همین ردیف‌ها
   * با وضعیت PENDING صف می‌شوند و worker جداگانه آن‌ها را می‌فرستد.
   */
  async dispatch(
    notificationId: string,
    options: { userIds?: string[]; excludeUserIds?: string[] } = {},
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND');

    try {
      const userIds = await this.resolveAudience(
        notification.audience,
        notification.businessId,
        options.userIds,
        options.excludeUserIds,
      );

      const smsStatus = notification.sendSms
        ? NotificationSmsStatus.PENDING
        : NotificationSmsStatus.NONE;

      for (let i = 0; i < userIds.length; i += RECIPIENT_CHUNK) {
        const chunk = userIds.slice(i, i + RECIPIENT_CHUNK);
        await this.prisma.notificationRecipient.createMany({
          data: chunk.map((userId) => ({ notificationId, userId, smsStatus })),
          skipDuplicates: true,
        });
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          recipientsCount: userIds.length,
        },
      });

      return { recipientsCount: userIds.length };
    } catch (e) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.FAILED },
      });
      throw e;
    }
  }

  /** تبدیل مخاطب به فهرست شناسه‌ی کاربران — همیشه با یک کوئری */
  private async resolveAudience(
    audience: NotificationAudience,
    businessId: string | null,
    explicitUserIds?: string[],
    excludeUserIds?: string[],
  ): Promise<string[]> {
    const exclude = new Set(excludeUserIds ?? []);
    let ids: string[] = [];

    switch (audience) {
      case NotificationAudience.USERS: {
        const users = await this.prisma.user.findMany({
          where: { id: { in: explicitUserIds ?? [] }, isActive: true },
          select: { id: true },
        });
        ids = users.map((u) => u.id);
        break;
      }
      case NotificationAudience.ADMINS: {
        const admins = await this.prisma.user.findMany({
          where: { isActive: true, role: { name: Role.Admin } },
          select: { id: true },
        });
        ids = admins.map((u) => u.id);
        break;
      }
      case NotificationAudience.ALL_USERS: {
        const users = await this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        ids = users.map((u) => u.id);
        break;
      }
      case NotificationAudience.BUSINESS_OWNER: {
        if (!businessId) throw new BadRequestException('BUSINESS_ID_REQUIRED');
        const business = await this.prisma.business.findUnique({
          where: { id: businessId },
          select: { ownerId: true },
        });
        ids = business ? [business.ownerId] : [];
        break;
      }
      case NotificationAudience.BUSINESS_FAVORITES: {
        if (!businessId) throw new BadRequestException('BUSINESS_ID_REQUIRED');
        const favorites = await this.prisma.favoriteBusiness.findMany({
          where: { businessId, user: { isActive: true } },
          select: { userId: true },
        });
        ids = favorites.map((f) => f.userId);
        break;
      }
    }

    return [...new Set(ids)].filter((id) => !exclude.has(id));
  }

  // ------------------------------------------------- ساخت دستی توسط کاربران

  /**
   * ادمین: اعلان بلافاصله ارسال می‌شود.
   * مالک: اعلان با وضعیت PENDING_APPROVAL ثبت می‌شود و تا تایید ادمین نمی‌رود.
   */
  async createByUser(actor: Actor, dto: CreateNotificationDto) {
    const isAdmin = actor.role === Role.Admin;

    if (!isAdmin) {
      // مالک فقط می‌تواند به علاقه‌مندانِ کسب‌وکار خودش اعلان بدهد
      if (dto.audience !== NotificationAudience.BUSINESS_FAVORITES) {
        throw new ForbiddenException('OWNER_AUDIENCE_NOT_ALLOWED');
      }
      await this.assertOwnsBusiness(dto.businessId as string, actor.sub);
    }

    const notification = await this.prisma.notification.create({
      data: {
        type: NotificationType.CUSTOM,
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        status: isAdmin
          ? NotificationStatus.QUEUED
          : NotificationStatus.PENDING_APPROVAL,
        sendSms: dto.sendSms ?? false,
        smsText: dto.sendSms ? (dto.smsText ?? null) : null,
        businessId: dto.businessId ?? null,
        createdById: actor.sub,
        data: dto.userIds?.length ? { userIds: dto.userIds } : Prisma.JsonNull,
        ...(isAdmin ? { approvedById: actor.sub, approvedAt: new Date() } : {}),
      },
    });

    if (isAdmin) {
      await this.dispatch(notification.id, { userIds: dto.userIds });
      return this.findOne(notification.id, actor);
    }
    return notification;
  }

  /** تایید و ارسال اعلانِ در انتظار — فقط ادمین */
  async approve(id: string, adminId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    if (notification.status !== NotificationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('NOTIFICATION_NOT_PENDING');
    }

    await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.QUEUED,
        approvedById: adminId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    // شناسه‌های ذخیره‌شده در data برای audience برابر USERS استفاده می‌شوند
    const stored = notification.data as { userIds?: string[] } | null;
    await this.dispatch(id, { userIds: stored?.userIds });
    return this.prisma.notification.findUnique({ where: { id } });
  }

  /** رد کردن اعلانِ در انتظار — فقط ادمین */
  async reject(id: string, adminId: string, reason?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    if (notification.status !== NotificationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('NOTIFICATION_NOT_PENDING');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.REJECTED,
        approvedById: adminId,
        approvedAt: new Date(),
        rejectionReason: reason?.trim() || null,
      },
    });
  }

  // ----------------------------------------------------------- لیست مدیریتی

  /** ادمین همه‌ی اعلان‌ها را می‌بیند، مالک فقط اعلان‌های ساخته‌ی خودش را */
  async findAll(actor: Actor, query: ListNotificationsDto) {
    const take = query.take ? +query.take : 10;
    const skip = query.skip ? +query.skip : 0;

    const where: Prisma.NotificationWhereInput = {
      ...(actor.role === Role.Admin ? {} : { createdById: actor.sub }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.businessId ? { businessId: query.businessId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { body: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        take,
        skip,
        ...(query.lastId ? { cursor: { id: query.lastId } } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, title: true, ownerId: true } },
          createdBy: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    return { items, page: { total, take, skip } };
  }

  async findOne(id: string, actor: Actor) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, title: true, ownerId: true } },
        createdBy: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    if (actor.role !== Role.Admin && notification.createdById !== actor.sub) {
      throw new ForbiddenException('NOT_YOUR_NOTIFICATION');
    }
    return notification;
  }

  async remove(id: string) {
    try {
      await this.prisma.notification.delete({ where: { id } });
      return { success: true };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('NOTIFICATION_NOT_FOUND');
      }
      throw e;
    }
  }

  // ------------------------------------------------------- صندوق هر کاربر

  /** صندوق اعلان کاربر جاری */
  async findMine(userId: string, query: ListMyNotificationsDto) {
    const take = query.take ? +query.take : 10;
    const skip = query.skip ? +query.skip : 0;

    const where: Prisma.NotificationRecipientWhereInput = {
      userId,
      ...(query.isRead !== undefined
        ? { isRead: query.isRead === 'true' }
        : {}),
    };

    const [total, unread, rows] = await Promise.all([
      this.prisma.notificationRecipient.count({ where }),
      this.prisma.notificationRecipient.count({
        where: { userId, isRead: false },
      }),
      this.prisma.notificationRecipient.findMany({
        where,
        take,
        skip,
        ...(query.lastId ? { cursor: { id: query.lastId } } : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          notification: {
            select: {
              id: true,
              type: true,
              title: true,
              body: true,
              data: true,
              businessId: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    // شکل خروجی: خودِ اعلان + وضعیت خواندنِ همین کاربر
    const items = rows.map((row) => ({
      id: row.id,
      isRead: row.isRead,
      readAt: row.readAt,
      createdAt: row.createdAt,
      notificationId: row.notification.id,
      type: row.notification.type,
      title: row.notification.title,
      body: row.notification.body,
      data: row.notification.data,
      businessId: row.notification.businessId,
    }));

    return { items, unread, page: { total, take, skip } };
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notificationRecipient.count({
      where: { userId, isRead: false },
    });
    return { unread };
  }

  /** `id` شناسه‌ی ردیفِ گیرنده است، نه خود اعلان */
  async markRead(id: string, userId: string) {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    if (!result.count) {
      const exists = await this.prisma.notificationRecipient.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    }
    return { success: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  /** مالکِ کسب‌وکار بودن — برای محدودکردن اعلان‌های مالک */
  private async assertOwnsBusiness(businessId: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    if (business.ownerId !== userId) {
      throw new ForbiddenException('NOT_YOUR_BUSINESS');
    }
  }
}
