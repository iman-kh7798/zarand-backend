import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { UpdateBusinessReviewDto } from './dto/update-business-review.dto';

@Injectable()
export class BusinessReviewService {
  constructor(private prisma: PrismaService) {}

  async create(
    businessId: string,
    userId: string,
    dto: CreateBusinessReviewDto,
  ) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    if (business.ownerId === userId) {
      throw new ForbiddenException('CANNOT_REVIEW_OWN_BUSINESS');
    }
    // check if already reviewed
    const existing = await this.prisma.businessReview.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (existing) throw new BadRequestException('REVIEW_ALREADY_EXISTS');

    const review = await this.prisma.businessReview.create({
      data: {
        rating: dto.rating,
        body: dto.body,
        businessId,
        userId,
      },
    });
    return review;
  }

  async update(id: string, userId: string, dto: UpdateBusinessReviewDto) {
    const review = await this.prisma.businessReview.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.userId !== userId) throw new ForbiddenException();
    const updated = await this.prisma.businessReview.update({
      where: { id },
      data: {
        rating: dto.rating ?? review.rating,
        body: dto.body ?? review.body,
      },
    });
    return updated;
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.businessReview.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.userId !== userId) throw new ForbiddenException();
    await this.prisma.businessReview.delete({ where: { id } });
    return { success: true };
  }

  async listByBusiness(businessId: string) {
    const [agg, reviews] = await Promise.all([
      this.prisma.businessReview.aggregate({
        where: { businessId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.businessReview.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, phone: true } } },
      }),
    ]);
    return {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      count: agg._count._all ?? 0,
      reviews,
    };
  }
}
