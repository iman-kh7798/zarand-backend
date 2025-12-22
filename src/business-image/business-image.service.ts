import { Injectable } from '@nestjs/common';
import { CreateBusinessImageDto } from './dto/create-business-image.dto';
import { UpdateBusinessImageDto } from './dto/update-business-image.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BusinessImageService {
  constructor(private prisma: PrismaService) {}

  async create(createBusinessImageDto: CreateBusinessImageDto) {
    return this.prisma.businessImage.create({
      data: {
        url: createBusinessImageDto.url,
        altText: createBusinessImageDto.altText,
        businessId: createBusinessImageDto.businessId,
      },
    });
  }

  findAll() {
    return `This action returns all businessImage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} businessImage`;
  }

  update(id: number, updateBusinessImageDto: UpdateBusinessImageDto) {
    return `This action updates a #${id} businessImage`;
  }

  remove(id: number) {
    return `This action removes a #${id} businessImage`;
  }
}
