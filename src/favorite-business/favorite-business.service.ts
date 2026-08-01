import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FavoriteBusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, businessId: string) {
    try {
      const favorite = await this.prisma.favoriteBusiness.create({
        data: {
          user: { connect: { id: userId } },
          business: { connect: { id: businessId } },
        },
        include: {
          business: {
            include: {
              BusinessImage: true,
              category: true,
            },
          },
        },
      });

      return favorite;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('BUSINESS_ALREADY_IN_FAVORITES');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('BUSINESS_OR_USER_NOT_FOUND');
      }
      throw error;
    }
  }

  findAll(userId: string) {
    return this.prisma.favoriteBusiness.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          include: {
            BusinessImage: true,
            category: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, businessId: string) {
    const favorite = await this.prisma.favoriteBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: {
        business: {
          include: {
            BusinessImage: true,
            category: true,
          },
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('FAVORITE_BUSINESS_NOT_FOUND');
    }

    return favorite;
  }

  async remove(userId: string, businessId: string) {
    try {
      await this.prisma.favoriteBusiness.delete({
        where: { userId_businessId: { userId, businessId } },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('FAVORITE_BUSINESS_NOT_FOUND');
      }
      throw error;
    }

    return { message: 'Business removed from favorites successfully' };
  }
}
