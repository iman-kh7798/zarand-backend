/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBusinessDto,
  CreateBusinessSocialLinkDto,
} from './dto/create-business.dto';
import {
  UpdateBusinessDto,
  UpdateBusinessStatusDto,
} from './dto/update-business.dto';
import { BusinessImageService } from 'src/business-image/business-image.service';
import { CategoriesService } from 'src/categories/categories.service';
import { UploadService } from 'src/upload/upload.service';
import { BusinessStatus, Prisma } from '@prisma/client';
import { Role } from 'src/role/role.enum';
import { FavoriteBusinessService } from 'src/favorite-business/favorite-business.service';
import { BusinessReviewService } from 'src/business-review/business-review.service';
import { NotificationService } from 'src/notification/notification.service';
import { notificationTemplates } from 'src/notification/notification.templates';
import { NotificationAudience, NotificationType } from '@prisma/client';

/**
 * ترتیب تصاویر گالری: تصویر اصلی/کاور همیشه اول می‌آید، سپس بر اساس `position`
 * و قدمت. هر جا `BusinessImage` را include می‌کنیم همین ترتیب استفاده می‌شود.
 */
const PRIMARY_IMAGE_ORDER: Prisma.BusinessImageOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { position: 'asc' },
  { createdAt: 'asc' },
];

export interface BusinessListFilters {
  title?: string;
  status?: BusinessStatus;
  isActive?: boolean;
  ownerName?: string;
  categoryId?: string;
  categoryName?: string;
}

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private businessImageService: BusinessImageService,
    private favoriteBusinessService: FavoriteBusinessService,
    private categoryService: CategoriesService,
    private uploadService: UploadService,
    private businessReviewService: BusinessReviewService,
    private notificationService: NotificationService,
  ) {}

  async create(
    dto: CreateBusinessDto,
    userId: string,
    uploads: { filename: string; path: string }[] = [],
  ) {
    // هر کاربر فقط اجازه‌ی ثبت یک کسب‌وکار دارد
    const existingBusiness = await this.prisma.business.count({
      where: { ownerId: userId },
    });
    if (existingBusiness > 0) {
      this.uploadService.removeMany(uploads.map((upload) => upload.path));
      throw new BadRequestException('BUSINESS_LIMIT_EXCEEDED');
    }
    try {
      const business = await this.prisma.business.create({
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          phone: dto.phone,
          owner: { connect: { id: userId } },
          lat: dto.lat,
          lng: dto.lng,
          ...(dto.categoryId
            ? { category: { connect: { id: dto.categoryId } } }
            : {}),
          ...(dto.socialLinks?.length
            ? {
                socialLinks: {
                  createMany: {
                    data: dto.socialLinks.map((link) => ({
                      platform: link.platform,
                      url: link.url,
                    })),
                  },
                },
              }
            : {}),
        },
      });
      if (uploads.length) {
        const primaryIndex =
          dto.mainImageIndex !== undefined && dto.mainImageIndex !== ''
            ? Number(dto.mainImageIndex)
            : undefined;
        await this.addImages(business.id, uploads, undefined, primaryIndex);
      }

      // اعلان + پیامک برای ادمین‌ها (best-effort — خطا مانع ثبت نمی‌شود)
      const owner = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const content = notificationTemplates.BUSINESS_CREATED(
        business.title,
        owner?.name,
      );
      await this.notificationService.notify({
        type: NotificationType.BUSINESS_CREATED,
        audience: NotificationAudience.ADMINS,
        businessId: business.id,
        sendSms: true,
        data: { businessId: business.id },
        ...content,
      });
    } catch (error: any) {
      this.uploadService.removeMany(uploads.map((upload) => upload.path));
      if (error.code === 'P2025') {
        throw new NotFoundException('USER_NOT_EXISTS');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('DUPLICATE_SOCIAL_PLATFORM');
      }
      throw error;
    }
    return { message: 'Business created successfully' };
  }

  /**
   * تاریخ مبنای پوشه‌بندی آپلود (`uploads/businesses/YYYY/MM/DD`).
   * برای اینکه همه‌ی تصاویر یک کسب‌وکار کنار هم بمانند، `createdAt` خودِ
   * کسب‌وکار ملاک است نه زمان آپلود.
   */
  async getUploadDate(businessId: string): Promise<Date> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { createdAt: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    return business.createdAt;
  }

  async addImages(
    businessId: string,
    uploads: { filename: string; path: string }[],
    altText?: string,
    primaryIndex?: number,
  ) {
    const existingCount = await this.prisma.businessImage.count({
      where: { businessId },
    });
    if (existingCount + uploads.length > 10) {
      this.uploadService.removeMany(uploads.map((upload) => upload.path));
      throw new BadRequestException('BUSINESS_IMAGE_LIMIT_EXCEEDED');
    }

    // ایندکس کاورِ درخواستی فقط وقتی معتبر است که عدد صحیح و داخل بازه باشد.
    const chosenIndex =
      primaryIndex !== undefined &&
      Number.isInteger(primaryIndex) &&
      primaryIndex >= 0 &&
      primaryIndex < uploads.length
        ? primaryIndex
        : undefined;

    const hasPrimary =
      existingCount > 0 &&
      (await this.prisma.businessImage.count({
        where: { businessId, isPrimary: true },
      })) > 0;

    // اگر کاور صریح انتخاب شده و کسب‌وکار از قبل تصویر اصلی دارد، اول صفرش می‌کنیم.
    if (chosenIndex !== undefined && hasPrimary) {
      await this.prisma.businessImage.updateMany({
        where: { businessId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const images = await Promise.all(
      uploads.map((upload, index) => {
        const isPrimary =
          chosenIndex !== undefined
            ? index === chosenIndex
            : !hasPrimary && index === 0;
        return this.businessImageService.create({
          businessId,
          url: upload.path,
          altText,
          isPrimary,
        });
      }),
    );
    return images;
  }

  /**
   * لیست صفحه‌بندی‌شده‌ی کسب‌وکارها به همراه میانگین و تعداد نظرات هر کدام.
   * تنها نقطه‌ی اجرای کوئری لیست؛ `findBusinesses` فقط `where` را می‌سازد.
   */
  private async listBusinesses(
    where: Prisma.BusinessWhereInput | undefined,
    take: number,
    skip: number,
    lastId: string | undefined,
  ) {
    const [total, rows] = await Promise.all([
      this.prisma.business.count({ where }),
      this.prisma.business.findMany({
        where,
        take,
        skip,
        ...(lastId ? { cursor: { id: lastId } } : {}),
        include: {
          owner: true,
          BusinessImage: { orderBy: PRIMARY_IMAGE_ORDER },
          category: true,
        },
      }),
    ]);
    const businesses = await this.businessReviewService.withStats(rows);
    return { businesses, page: { total, take, skip } };
  }

  /**
   * ساخت شرط‌های فیلتر لیست کسب‌وکارها بر اساس نقش درخواست‌دهنده.
   *
   * قواعد دسترسی:
   * - ADMIN: همه‌ی کسب‌وکارها؛ فیلترهای `status` و `isActive` اعمال می‌شوند.
   * - OWNER: فقط کسب‌وکارهای خودش؛ `status`/`isActive` نادیده گرفته می‌شود.
   * - ناشناس (یا هر نقش دیگر): فقط `status: APPROVED` و `isActive: true`؛
   *   `status`/`isActive` ورودی نادیده گرفته می‌شود.
   *
   * توجه: کانکتور MySQL در Prisma از `mode: 'insensitive'` پشتیبانی نمی‌کند؛
   * کولیشن پیش‌فرض MySQL/MariaDB خودش case-insensitive است.
   */
  private buildListWhere(
    filters: BusinessListFilters,
    user?: { role: Role; sub: string },
  ): Prisma.BusinessWhereInput {
    const where: Prisma.BusinessWhereInput = {};
    const isAdmin = user?.role === Role.Admin;

    if (isAdmin) {
      // فیلترهای مدیریتی فقط برای ادمین
      if (filters.status) where.status = filters.status;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
    } else if (user?.role === Role.Owner) {
      // مالک فقط کسب‌وکارهای خودش را می‌بیند (همه‌ی وضعیت‌ها)
      where.ownerId = user.sub;
    } else {
      // عمومی / ناشناس
      where.status = BusinessStatus.APPROVED;
      where.isActive = true;
    }

    if (filters.title) {
      where.title = { contains: filters.title };
    }

    if (filters.ownerName) {
      where.owner = { name: { contains: filters.ownerName } };
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.categoryName) {
      where.category = { name: { contains: filters.categoryName } };
    }

    return where;
  }

  /**
   * لیست کسب‌وکارها با فیلتر و صفحه‌بندی.
   * جایگزین findAll/findByStatus/findPerOwner/findPerOwnerByStatus شده است.
   */
  async findBusinesses(
    filters: BusinessListFilters,
    take: number,
    skip: number,
    lastId: string | undefined,
    user?: { role: Role; sub: string },
  ) {
    return this.listBusinesses(
      this.buildListWhere(filters, user),
      take,
      skip,
      lastId,
    );
  }

  async findOne(id: string, user?: { role: Role; sub: string }) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: true,
        BusinessImage: { orderBy: PRIMARY_IMAGE_ORDER },
        category: true,
        socialLinks: {
          select: { id: true, createdAt: true, url: true, platform: true },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('BUSSINESS_NOT_FOUND');
    }

    // تصویر اصلی/کاور جدا هم برگردانده می‌شود؛ اگر هیچ‌کدام اصلی نبود، اولین تصویر.
    const mainImage =
      business.BusinessImage.find((img) => img.isPrimary) ??
      business.BusinessImage[0] ??
      null;

    if (user && user.role === Role.Owner) {
      let isFavorite: boolean = false;
      try {
        const favorite = await this.favoriteBusinessService.findOne(
          user.sub,
          business.id,
        );
        if (favorite) {
          isFavorite = true;
        }
      } catch (err) {
        console.log(err);
      }
      return { ...business, mainImage, isFavorite };
    }

    return { ...business, mainImage };
  }

  async update(id: string, dto: UpdateBusinessDto, ownerId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const business = await tx.business.update({
          where: { id, ownerId },
          data: {
            title: dto.title,
            description: dto.description,
            address: dto.address,
            phone: dto.phone,
            lat: dto.lat,
            lng: dto.lng,
          },
        });

        if (dto.socialLinks) {
          await this.replaceSocialLinks(tx, id, dto.socialLinks);
        }

        return business;
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('BUSINESS_NOT_EXISTS');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('DUPLICATE_SOCIAL_PLATFORM');
      }
      throw error;
    }
  }

  async adminUpdate(id: string, dto: UpdateBusinessDto) {
    return await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address,
          phone: dto.phone,
        },
      });

      if (dto.socialLinks) {
        await this.replaceSocialLinks(tx, id, dto.socialLinks);
      }

      return business;
    });
  }

  private async replaceSocialLinks(
    tx: Prisma.TransactionClient,
    businessId: string,
    links: CreateBusinessSocialLinkDto[],
  ) {
    await tx.businessSocialLink.deleteMany({ where: { businessId } });
    if (links.length) {
      await tx.businessSocialLink.createMany({
        data: links.map((link) => ({
          businessId,
          platform: link.platform,
          url: link.url,
        })),
      });
    }
  }

  async updateImage(id: string, imageId: string) {
    return await this.prisma.business.update({
      where: { id },
      data: {
        imageId,
      },
    });
  }

  async updateStatus(id: string, body: UpdateBusinessStatusDto) {
    const isRejected = body.status === BusinessStatus.REJECTED;
    const business = await this.prisma.business.update({
      where: { id },
      data: {
        status: body.status,
        // دلیل فقط برای رد شدن معنا دارد؛ با تایید پاک می‌شود
        statusReason: isRejected ? (body.reason?.trim() ?? null) : null,
      },
    });

    // اعلان + پیامک برای مالک؛ در حالت رد، دلیل هم فرستاده می‌شود
    const content = isRejected
      ? notificationTemplates.BUSINESS_REJECTED(
          business.title,
          business.statusReason,
        )
      : notificationTemplates.BUSINESS_APPROVED(business.title);
    await this.notificationService.notify({
      type: isRejected
        ? NotificationType.BUSINESS_REJECTED
        : NotificationType.BUSINESS_APPROVED,
      audience: NotificationAudience.BUSINESS_OWNER,
      businessId: business.id,
      sendSms: true,
      data: { businessId: business.id },
      ...content,
    });

    return business;
  }

  async remove(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { BusinessImage: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    const result = await this.prisma.business.delete({
      where: { id },
    });
    this.uploadService.removeMany(
      business.BusinessImage.map((image) => image.url),
    );
    return result;
  }

  async removeByOwner(id: string, ownerId: string) {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id, ownerId },
        include: { BusinessImage: true },
      });
      if (!business) throw new NotFoundException('BUSINESS_NOT_EXISTS');
      await this.prisma.business.delete({
        where: { id, ownerId },
      });
      this.uploadService.removeMany(
        business.BusinessImage.map((image) => image.url),
      );
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('BUSINESS_NOT_EXISTS');
      }
      throw error;
    }
    return { message: 'Business deleted successfully' };
  }

  async addImage(businessId: string, url: string, altText?: string) {
    const image = await this.businessImageService.create({
      businessId,
      url,
      altText,
    });
    return image;
  }

  deleteImage(businessId: string, imageId: string) {
    return this.businessImageService.remove(imageId, businessId);
  }

  /**
   * چک می‌کند کسب‌وکار وجود دارد و درخواست‌دهنده اجازه‌ی مدیریت آن را دارد
   * (ADMIN همه، OWNER فقط کسب‌وکار خودش). در غیر این صورت خطا می‌دهد.
   */
  private async assertBusinessManageable(
    businessId: string,
    user: { sub: string; role: Role },
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    if (user.role !== Role.Admin && business.ownerId !== user.sub) {
      throw new ForbiddenException('BUSINESS_ACCESS_DENIED');
    }
  }

  /**
   * تصویر انتخابی را «تصویر اصلی/کاور» کسب‌وکار می‌کند.
   * ابتدا مالکیت/دسترسی کسب‌وکار احراز می‌شود، سپس در یک تراکنش تنها همین تصویر
   * `isPrimary: true` می‌شود و بقیه‌ی تصاویر همان کسب‌وکار صفر می‌شوند.
   */
  async setMainImage(
    businessId: string,
    imageId: string,
    user: { sub: string; role: Role },
  ) {
    await this.assertBusinessManageable(businessId, user);
    return this.businessImageService.setPrimary(businessId, imageId);
  }

  async replaceImage(
    businessId: string,
    imageId: string,
    upload: { filename: string; path: string },
    altText?: string,
  ) {
    const image = await this.prisma.businessImage.findFirst({
      where: { id: imageId, businessId },
    });

    if (!image) {
      this.uploadService.remove(upload.path);
      throw new NotFoundException('BUSINESS_IMAGE_NOT_FOUND');
    }

    const replacement = await this.prisma.businessImage.update({
      where: { id: imageId },
      data: {
        url: upload.path,
        ...(altText !== undefined ? { altText } : {}),
      },
    });

    this.uploadService.remove(image.url);
    return replacement;
  }

  async addFavorite(businessId: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');

    try {
      await this.prisma.favoriteBusiness.create({
        data: { userId, businessId },
      });
    } catch (error: any) {
      // P2002 = unique constraint violation (already favorited) -> idempotent, ignore
      if (error.code !== 'P2002') throw error;
    }

    return { message: 'BUSINESS_ADDED_TO_FAVORITES' };
  }

  async removeFavorite(businessId: string, userId: string) {
    await this.prisma.favoriteBusiness.deleteMany({
      where: { userId, businessId },
    });
    return { message: 'BUSINESS_REMOVED_FROM_FAVORITES' };
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favoriteBusiness.findMany({
      where: { userId },
      include: {
        business: {
          include: {
            owner: true,
            BusinessImage: { orderBy: PRIMARY_IMAGE_ORDER },
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.businessReviewService.withStats(
      favorites.map((f) => f.business),
    );
  }
}
