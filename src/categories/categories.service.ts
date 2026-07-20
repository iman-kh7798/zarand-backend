import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateCategoryDto,
  AddBusinessToCategoryDto,
  RemoveBusinessFromCategoryDto,
  UpdateCategoryDto,
} from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          parentId: dto.parentId ? dto.parentId : null,
        },
        include: {
          children: true,
          parent: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new NotFoundException('PARENTID_DOES_NOT_EXISTS');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('SLUG_ALREADY_IN_USE');
      }
    }
  }

  async findAll() {
    return await this.prisma.category.findMany({
      include: {
        children: true,
        parent: true,
        businessCategories: {
          include: {
            business: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        businessCategories: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('CANNOT_BE_OWN_PARENT');
    }
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          parentId: dto.parentId,
          isActive: dto.isActive,
        },
        include: {
          children: true,
          parent: true,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new NotFoundException('PARENTID_OR_CATEGORYID_NOT_EXISTS');
      }
      if (error.code === 'P2002') {
        throw new ConflictException('SLUG_ALREADY_IN_USE');
      }
    }
  }

  async delete(id: string) {
    await this.findOne(id);

    return await this.prisma.category.delete({
      where: { id },
    });
  }

  async addBusinessToCategory(dto: AddBusinessToCategoryDto) {
    await this.findOne(dto.categoryId);

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });

    if (!business) {
      throw new NotFoundException('BUSINESS_NOT_FOUND');
    }

    return await this.prisma.businessCategory.create({
      data: {
        businessId: dto.businessId,
        categoryId: dto.categoryId,
      },
      include: {
        business: true,
        category: true,
      },
    });
  }
  async addBusinessToCategoryWithoutCheck(dto: AddBusinessToCategoryDto) {
    await this.findOne(dto.categoryId);

    return await this.prisma.businessCategory.create({
      data: {
        businessId: dto.businessId,
        categoryId: dto.categoryId,
      },
      include: {
        business: true,
        category: true,
      },
    });
  }

  async removeBusinessFromCategory(dto: RemoveBusinessFromCategoryDto) {
    const exists = await this.prisma.businessCategory.findUnique({
      where: {
        businessId_categoryId: {
          businessId: dto.businessId,
          categoryId: dto.categoryId,
        },
      },
    });

    if (!exists) {
      throw new NotFoundException('BUSINESS_CATEGORY_NOT_FOUND');
    }

    return await this.prisma.businessCategory.delete({
      where: {
        businessId_categoryId: {
          businessId: dto.businessId,
          categoryId: dto.categoryId,
        },
      },
    });
  }

  async getBusinessesByCategory(categoryId: string) {
    await this.findOne(categoryId);

    return await this.prisma.businessCategory.findMany({
      where: { categoryId },
      include: {
        business: {
          include: {
            products: true,
            BusinessImage: true,
          },
        },
      },
    });
  }

  async getCategoriesByBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('BUSINESS_NOT_FOUND');
    }

    return await this.prisma.businessCategory.findMany({
      where: { businessId },
      include: {
        category: {
          include: {
            parent: true,
            children: true,
          },
        },
      },
    });
  }

  // async updateProductCategory(productId: string, categoryId: string) {
  //   const product = await this.prisma.product.findUnique({
  //     where: { id: productId },
  //   });

  //   if (!product) {
  //     throw new NotFoundException('PRODUCT_NOT_FOUND');
  //   }

  //   await this.findOne(categoryId);

  //   return await this.prisma.product.update({
  //     where: { id: productId },
  //     data: {
  //       categoryId,
  //     },
  //     include: {
  //       category: true,
  //       business: true,
  //     },
  //   });
  // }

  // async removeProductCategory(productId: string) {
  //   const product = await this.prisma.product.findUnique({
  //     where: { id: productId },
  //   });

  //   if (!product) {
  //     throw new NotFoundException('PRODUCT_NOT_FOUND');
  //   }

  //   return await this.prisma.product.update({
  //     where: { id: productId },
  //     data: {
  //       categoryId: null,
  //     },
  //   });
  // }

  // async getProductsByCategory(categoryId: string) {
  //   await this.findOne(categoryId);

  //   return await this.prisma.product.findMany({
  //     where: { categoryId },
  //     include: {
  //       business: true,
  //       images: true,
  //       variants: true,
  //     },
  //   });
  // }
}
