/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBusinessDto) {
    return await this.prisma.business.create({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address as string,
        phone: dto.phone,
        owner: { connect: { id: dto.ownerId } },
      },
    });
  }

  async findAll() {
    return await this.prisma.business.findMany({
      include: {
        owner: true,
        products: true,
      },
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: true,
        products: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    return await this.prisma.business.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address,
        phone: dto.phone,
        owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.business.delete({
      where: { id },
    });
  }
}
