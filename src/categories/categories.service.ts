import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import {
  CreateCategoryDto,
  SetBusinessCategoryDto,
  UpdateCategoryDto,
} from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(dto: CreateCategoryDto, coverImageUrl?: string) {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          parentId: dto.parentId ? dto.parentId : null,
          coverImageUrl,
        },
        include: {
          children: true,
          parent: true,
        },
      });
    } catch (error: any) {
      this.uploadService.remove(coverImageUrl);
      if (error.code === 'P2003') {
        throw new NotFoundException('PARENTID_DOES_NOT_EXISTS');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('SLUG_ALREADY_IN_USE');
      }
      throw error;
    }
  }

  async findAll() {
    return await this.prisma.category.findMany({
      include: {
        children: true,
        parent: true,
        businesses: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    return category;
  }

  async findOneBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, coverImageUrl?: string) {
    try {
      const existing = await this.findOne(id);

      if (dto.parentId && dto.parentId === id) {
        throw new BadRequestException('CANNOT_BE_OWN_PARENT');
      }

      const result = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          parentId: dto.parentId,
          isActive: dto.isActive,
          ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        },
        include: {
          children: true,
          parent: true,
        },
      });
      if (coverImageUrl !== undefined && existing.coverImageUrl) {
        this.uploadService.remove(existing.coverImageUrl);
      }
      return result;
    } catch (error: any) {
      this.uploadService.remove(coverImageUrl);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('PARENTID_OR_CATEGORYID_NOT_EXISTS');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('SLUG_ALREADY_IN_USE');
      }
      throw error;
    }
  }

  async delete(id: string) {
    const category = await this.findOne(id);

    const result = await this.prisma.category.delete({
      where: { id },
    });
    this.uploadService.remove(category.coverImageUrl);
    return result;
  }

  /** Assign (or change) the category of a business */
  async setBusinessCategory(dto: SetBusinessCategoryDto) {
    await this.findOne(dto.categoryId);

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });
    if (!business) {
      throw new NotFoundException('BUSINESS_NOT_FOUND');
    }

    return await this.prisma.business.update({
      where: { id: dto.businessId },
      data: { categoryId: dto.categoryId },
      include: { category: true },
    });
  }

  /** Same as setBusinessCategory but without checking category existence (used internally, e.g. on business creation) */
  async setBusinessCategoryWithoutCheck(
    businessId: string,
    categoryId: string,
  ) {
    return await this.prisma.business.update({
      where: { id: businessId },
      data: { categoryId },
      include: { category: true },
    });
  }

  /** Remove the category from a business (set to null) */
  async removeBusinessCategory(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException('BUSINESS_NOT_FOUND');
    }

    return await this.prisma.business.update({
      where: { id: businessId },
      data: { categoryId: null },
    });
  }

  async getBusinessesByCategory(categoryId: string) {
    await this.findOne(categoryId);

    return await this.prisma.business.findMany({
      where: { categoryId },
      include: {
        products: true,
        BusinessImage: true,
      },
    });
  }

  async getCategoryByBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        category: {
          include: {
            parent: true,
            children: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('BUSINESS_NOT_FOUND');
    }

    return business.category;
  }
}
