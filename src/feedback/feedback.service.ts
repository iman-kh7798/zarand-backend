import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ListFeedbackDto } from './dto/list-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  // ثبت پیشنهاد جدید از فرم عمومی سایت
  async create(dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        name: dto.name,
        contact: dto.contact ?? null,
        message: dto.message,
      },
    });
  }

  // لیست پیشنهادها برای پنل مدیریت
  async findAll(query: ListFeedbackDto) {
    const take = query.take ? +query.take : 10;
    const skip = query.skip ? +query.skip : 0;

    const where: Prisma.FeedbackWhereInput = {
      ...(query.isRead !== undefined
        ? { isRead: query.isRead === 'true' }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { contact: { contains: query.search } },
              { message: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        take,
        skip,
        ...(query.lastId ? { cursor: { id: query.lastId } } : {}),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { items, page: { total, take, skip } };
  }

  async findOne(id: string) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('FEEDBACK_NOT_FOUND');
    return feedback;
  }

  // علامت‌گذاری خوانده‌شده / خوانده‌نشده
  async setRead(id: string, isRead: boolean) {
    try {
      return await this.prisma.feedback.update({
        where: { id },
        data: { isRead },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('FEEDBACK_NOT_FOUND');
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.feedback.delete({ where: { id } });
      return { success: true };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('FEEDBACK_NOT_FOUND');
      }
      throw e;
    }
  }
}
