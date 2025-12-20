/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import {
  UpdateBusinessDto,
  UpdateBusinessStatusDto,
} from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBusinessDto, userId: string) {
    try {
      return await this.prisma.business.create({
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          phone: dto.phone,
          imageId: dto.image,
          owner: { connect: { id: userId } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('USER_NOT_EXISTS');
      }
      throw error;
    }
  }

  async findAll() {
    return await this.prisma.business.findMany({
      include: {
        owner: true,
        products: true,
      },
    });
  }

  async findPerBusiness(id: string) {
    return await this.prisma.business.findMany({
      where: { ownerId: id },
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
      throw new NotFoundException('BUSSINESS_NOT_FOUND');
    }

    return business;
  }

  async findOnePerOwner(id: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id, ownerId },
      include: {
        owner: true,
        products: true,
      },
    });

    if (!business) {
      throw new NotFoundException('BUSSINESS_NOT_FOUND');
    }

    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    // return await this.prisma.business.update({
    //   where: { id },
    //   data: {
    //     title: dto.title,
    //     description: dto.description,
    //     address: dto.address,
    //     owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
    //   },
    // });
  }

  async updateByOwner(id: string, dto: UpdateBusinessDto, ownerId: string) {
    // return await this.prisma.business.update({
    //   where: { id },
    //   data: {
    //     title: dto.title,
    //     description: dto.description,
    //     address: dto.address,
    //     owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
    //   },
    // });
  }

  async updateStatus(id: string, body: UpdateBusinessStatusDto) {
    const dbStatus = body.status.toUpperCase();
    return await this.prisma.business.update({
      where: { id },
      data: {
        status: dbStatus,
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.business.delete({
      where: { id },
    });
  }

  async removeByOwner(id: string, ownerId: string) {
    return await this.prisma.business.delete({
      where: { id, ownerId },
    });
  }
}
