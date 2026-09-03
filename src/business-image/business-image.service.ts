import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBusinessImageDto } from './dto/create-business-image.dto';
import { UpdateBusinessImageDto } from './dto/update-business-image.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { SetMainImageResponse } from './dto/set-main-image.dto';

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
        isPrimary: createBusinessImageDto.isPrimary ?? false,
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

  /**
   * یک تصویر گالری را «تصویر اصلی/کاور» کسب‌وکار می‌کند.
   * چون در هر لحظه فقط یک تصویر می‌تواند اصلی باشد، ابتدا بقیه‌ی تصاویر همان
   * `businessId` صفر می‌شوند و سپس تصویر انتخابی `isPrimary: true` می‌گیرد.
   * کل عملیات داخل یک تراکنش انجام می‌شود تا رقابت/ناسازگاری داده رخ ندهد.
   *
   * ⚠️ این متد فقط تعلق تصویر به کسب‌وکار را چک می‌کند؛ احراز مالکیتِ کسب‌وکار
   * باید قبل از صدا زدن این متد (در `BusinessService`) انجام شده باشد.
   */
  async setPrimary(
    businessId: string,
    imageId: string,
  ): Promise<SetMainImageResponse> {
    const image = await this.prisma.businessImage.findFirst({
      where: { id: imageId, businessId },
      select: { id: true },
    });
    if (!image) throw new NotFoundException('BUSINESS_IMAGE_NOT_FOUND');

    await this.prisma.$transaction([
      this.prisma.businessImage.updateMany({
        where: { businessId, isPrimary: true, NOT: { id: imageId } },
        data: { isPrimary: false },
      }),
      this.prisma.businessImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return { message: 'BUSINESS_IMAGE_PRIMARY_SET', businessId, imageId };
  }

  async remove(id: string, businessId?: string) {
    const image = await this.prisma.businessImage.findFirst({
      where: { id, ...(businessId ? { businessId } : {}) },
    });
    if (!image) return null;

    await this.prisma.$transaction(async (tx) => {
      await tx.businessImage.delete({ where: { id } });

      // اگر تصویر حذف‌شده «اصلی» بود، اولین تصویر باقی‌مانده جانشین می‌شود.
      if (image.isPrimary) {
        const next = await tx.businessImage.findFirst({
          where: { businessId: image.businessId },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (next) {
          await tx.businessImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    this.uploadService.remove(image.url);
    return image;
  }
}
