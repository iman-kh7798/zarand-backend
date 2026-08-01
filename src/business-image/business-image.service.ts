import { Injectable } from '@nestjs/common';
import { CreateBusinessImageDto } from './dto/create-business-image.dto';
import { UpdateBusinessImageDto } from './dto/update-business-image.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class BusinessImageService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

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

  findOne(id: string) {
    return `This action returns a #${id} businessImage`;
  }

  update(id: string, updateBusinessImageDto: UpdateBusinessImageDto) {
    return `This action updates a #${id} businessImage`;
  }

  async remove(id: string, businessId?: string) {
    const image = await this.prisma.businessImage.findFirst({
      where: { id, ...(businessId ? { businessId } : {}) },
    });
    if (!image) return null;
    await this.prisma.businessImage.delete({ where: { id } });
    this.uploadService.remove(image.url);
    return image;
  }
}
