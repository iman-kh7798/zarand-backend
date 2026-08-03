/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import {
  UpdateBusinessDto,
  UpdateBusinessStatusDto,
} from './dto/update-business.dto';
import { BusinessImageService } from 'src/business-image/business-image.service';
import { CategoriesService } from 'src/categories/categories.service';
import { UploadService } from 'src/upload/upload.service';

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
        // @ts-ignore
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          phone: dto.phone,
          owner: { connect: { id: userId } },
          ...(dto.categoryId
            ? { category: { connect: { id: dto.categoryId } } }
            : {}),
        },
      });
      if (uploads.length) await this.addImages(business.id, uploads);
      // if (business && dto.image) {
      //   const businessImage = await this.businessImageService.create({
      //     businessId: business.id,
      //     url: dto.image,
      //   });
      //   await this.updateImage(business.id, businessImage.id);
      // }
    } catch (error: any) {
      this.uploadService.removeMany(uploads.map((upload) => upload.path));
      if (error.code === 'P2025') {
        throw new NotFoundException('USER_NOT_EXISTS');
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

  async findAll() {
    return await this.prisma.business.findMany({
      include: {
        owner: true,
        BusinessImage: true,
        category: true
      },
    });
  }

  async findPerBusiness(id: string) {
    return await this.prisma.business.findMany({
      where: { ownerId: id },
      include: {
        owner: true,
        BusinessImage: true,
        category: true,
      },
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: true,
        products: true,
        BusinessImage: true,
        category: true,
      },
    });

    if (!business) {
      throw new NotFoundException('BUSSINESS_NOT_FOUND');
    }

    return business;
  }

  async findOnePerOwner(id: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id, ownerId },
      include: {
        owner: true,
        products: true,
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
    return await this.prisma.business.update({
      where: { id, ownerId },
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address,
        phone: dto.phone,
      },
    });
  }

  async adminUpdate(id: string, dto: UpdateBusinessDto) {
    return await this.prisma.business.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address,
        phone: dto.phone,
      },
    });
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
    const dbStatus = body.status.toUpperCase();
    return await this.prisma.business.update({
      where: { id },
      data: {
        status: dbStatus,
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
            products: true,
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
