/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductImageService } from 'src/product-image/product-image.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private productImageService: ProductImageService,
  ) {}

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        title: dto.title,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price, // Decimal as string
        business: { connect: { id: dto.businessId } },
        category: dto.categoryId
          ? { connect: { id: dto.categoryId } }
          : undefined,
      },
    });
    if (product && dto.images && dto.images.length) {
      const images: string[] = [];
      for (let i = 0; i < dto.images.length; i++) {
        const image = await this.productImageService.create({
          productId: product.id,
          url: dto.images[i],
        });
        images.push(image.id);
      }
      await this.prisma.product.update({
        where: { id: product.id },
        // @ts-ignore
        data: { images },
      });
    }
  }

  findAllByBusiness(businessId: string) {
    return this.prisma.product.findMany({
      where: { businessId },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        business: true,
        category: true,
        images: true,
        variants: true,
      },
    });
  }

  update(id: string, data: Partial<CreateProductDto>) {
    // return this.prisma.product.update({
    //   where: { id },
    //   data: {
    //     ...data,
    //     business: data.businessId
    //       ? { connect: { id: data.businessId } }
    //       : undefined,
    //     category: data.categoryId
    //       ? { connect: { id: data.categoryId } }
    //       : undefined,
    //   },
    // });
  }

  remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
