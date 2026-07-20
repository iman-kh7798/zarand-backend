/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import {
  UpdateBusinessDto,
  UpdateBusinessStatusDto,
} from './dto/update-business.dto';
import { BusinessImageService } from 'src/business-image/business-image.service';
import { CategoriesService } from 'src/categories/categories.service';

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private businessImageService: BusinessImageService,
    private categoryService: CategoriesService,
  ) {}

  async create(dto: CreateBusinessDto, userId: string) {
    try {
      const business = await this.prisma.business.create({
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          phone: dto.phone,
          // imageId: dto.image,
          owner: { connect: { id: userId } },
        },
      });
      if (business && dto.image) {
        const businessImage = await this.businessImageService.create({
          businessId: business.id,
          url: dto.image,
        });
        await this.updateImage(business.id, businessImage.id);
      }
      if (dto.categoryId) {
        await this.categoryService.addBusinessToCategoryWithoutCheck({
          businessId: business.id,
          categoryId: dto.categoryId,
        });
      }
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('USER_NOT_EXISTS');
      }
      throw error;
    }
    return { message: 'Business created successfully' };
  }

  async findAll() {
    return await this.prisma.business.findMany({
      include: {
        owner: true,
        products: true,
        BusinessImage: true,
      },
    });
  }

  async findPerBusiness(id: string) {
    return await this.prisma.business.findMany({
      where: { ownerId: id },
      include: {
        owner: true,
        products: true,
        BusinessImage: true,
        categories: true,
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
        categories: true,
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
        categories: true,
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
    return await this.prisma.business.delete({
      where: { id },
    });
  }

  async removeByOwner(id: string, ownerId: string) {
    try {
      await this.prisma.business.delete({
        where: { id, ownerId },
      });
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
    return this.businessImageService.remove(+imageId);
  }
}
