/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
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

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private businessImageService: BusinessImageService,
    private categoryService: CategoriesService,
    private uploadService: UploadService,
  ) {}

  async create(
    dto: CreateBusinessDto,
    userId: string,
    uploads: { filename: string; path: string }[] = [],
  ) {
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
      if (uploads.length) await this.addImages(business.id, uploads);
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

  async addImages(
    businessId: string,
    uploads: { filename: string; path: string }[],
    altText?: string,
  ) {
    const existingCount = await this.prisma.businessImage.count({
      where: { businessId },
    });
    if (existingCount + uploads.length > 10) {
      this.uploadService.removeMany(uploads.map((upload) => upload.path));
      throw new BadRequestException('BUSINESS_IMAGE_LIMIT_EXCEEDED');
    }
    const images = await Promise.all(
      uploads.map((upload) =>
        this.businessImageService.create({
          businessId,
          url: upload.path,
          altText,
        }),
      ),
    );
    return images;
  }

  async findAll(take: number, skip: number, lastId: string | undefined) {
    const [total, businesses] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.findMany({
        take,
        skip,
        ...(lastId ? { cursor: { id: lastId } } : {}),
        include: {
          owner: true,
          BusinessImage: true,
          category: true,
        },
      }),
    ]);
    return { businesses, page: { total, take, skip } };
  }

  async findPerOwner(
    id: string,
    take: number,
    skip: number,
    lastId: string | undefined,
  ) {
    const [total, businesses] = await Promise.all([
      this.prisma.business.count({ where: { ownerId: id } }),
      this.prisma.business.findMany({
        where: { ownerId: id },
        take,
        skip,
        ...(lastId ? { cursor: { id: lastId } } : {}),
        include: {
          owner: true,
          BusinessImage: true,
          category: true,
        },
      }),
    ]);
    return { businesses, page: { total, take, skip } };
  }

  async findByStatus(
    status: BusinessStatus,
    take: number,
    skip: number,
    lastId: string | undefined,
  ) {
    const [total, businesses] = await Promise.all([
      this.prisma.business.count({ where: { status } }),
      this.prisma.business.findMany({
        where: { status },
        take,
        skip,
        ...(lastId ? { cursor: { id: lastId } } : {}),
        include: {
          owner: true,
          BusinessImage: true,
          category: true,
        },
      }),
    ]);
    return { businesses, page: { total, take, skip } };
  }

  async findPerOwnerByStatus(
    ownerId: string,
    status: BusinessStatus,
    take: number,
    skip: number,
    lastId: string | undefined,
  ) {
    const [total, businesses] = await Promise.all([
      this.prisma.business.count({ where: { ownerId, status } }),
      this.prisma.business.findMany({
        where: { ownerId, status },
        take,
        skip,
        ...(lastId ? { cursor: { id: lastId } } : {}),
        include: {
          owner: true,
          BusinessImage: true,
          category: true,
        },
      }),
    ]);
    return { businesses, page: { total, take, skip } };
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: true,
        BusinessImage: true,
        category: true,
      },
    });

    if (!business) {
      throw new NotFoundException('BUSSINESS_NOT_FOUND');
    }

    return business;
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
    return await this.prisma.business.update({
      where: { id },
      data: {
        status: body.status,
      },
    });
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
            BusinessImage: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => f.business);
  }
}
