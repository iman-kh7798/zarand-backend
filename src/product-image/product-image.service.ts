import { Injectable } from '@nestjs/common';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductImageService {
  constructor(private prisma: PrismaService) {}
  create(createProductImageDto: CreateProductImageDto) {
    return this.prisma.productImage.create({
      data: {
        url: createProductImageDto.url,
        productId: createProductImageDto.productId,
        altText: createProductImageDto.altText,
      },
    });
  }

  findAll() {
    return `This action returns all productImage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productImage`;
  }

  update(id: number, updateProductImageDto: UpdateProductImageDto) {
    return `This action updates a #${id} productImage`;
  }

  remove(id: number) {
    return `This action removes a #${id} productImage`;
  }
}
