/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBusinessByUserDto,
  CreateBusinessDto,
} from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async createByAdmin(dto: CreateBusinessDto) {
    try {
      return await this.prisma.business.create({
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          phone: dto.phone,
          owner: { connect: { id: dto.ownerId } },
          status: 'APPROVED',
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025')
        throw new NotFoundException('USER_NOT_EXISTS');
      throw error;
    }
  }

  async createByUser(dto: CreateBusinessByUserDto, userId: string) {
    return await this.prisma.business.create({
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address as string,
        phone: dto.phone,
        owner: { connect: { id: userId } },
        status: 'PENDING',
      },
    });
  }

  async findApproved() {
    return await this.prisma.business.findMany({
      where: { status: 'APPROVED' },
      include: {
        owner: true,
        // products: true, // فاز اول لازم نیست
      },
      orderBy: { createdAt: 'desc' as any },
    });
  }

  async findApprovedOne(id: string) {
    const business = await this.prisma.business.findFirst({
      where: { id, status: 'APPROVED' },
      include: { owner: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    return business;
  }

  async findAllAdmin() {
    return await this.prisma.business.findMany({
      include: { owner: true },
      orderBy: { createdAt: 'desc' as any },
    });
  }

  async findOneAdmin(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { owner: true },
    });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    return business;
  }

  async approve(id: string) {
    return await this.prisma.business.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(id: string) {
    return await this.prisma.business.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

    // ✅ ویرایش: این رو بهتره با guard مالکیت کنترل کنی
  async updateByOwner(id: string, dto: UpdateBusinessDto) {
    return await this.prisma.business.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address,
        phone: (dto as any).phone,
        // owner عوض کردن توسط owner نده (فقط admin)
      },
    });
  }

    async remove(id: string) {
    return await this.prisma.business.delete({ where: { id } });
  }
  // async createBussinessByUser(dto: CreateBusinessByUserDto) {
  //   let user;

  //   try {
  //     user = await this.users.create({
  //       phone: dto.phone,
  //       roleId: 2,
  //       password: dto.password,
  //       name: dto.name,
  //       email: dto.email,
  //     });
  //   } catch (err) {
  //     if (err.code === 'P2002') {
  //       throw new BadRequestException('PHONE_EXISTS');
  //     }
  //   }

  //   if (!user) {
  //     throw new ServiceUnavailableException('UNABLE_TOO_CREATE_USER');
  //   }

  //   try {
  //     return await this.prisma.business.create({
  //       data: {
  //         title: dto.title,
  //         description: dto.description,
  //         address: dto.address as string,
  //         phone: dto.phone,
  //         owner: { connect: { id: user.id } },
  //       },
  //     });
  //   } catch (error: any) {
  //     if (error.code === 'P2025') {
  //       throw new NotFoundException('USER_NOT_EXISTS');
  //     }
  //     throw error;
  //   }
  // }

  // async findAll() {
  //   return await this.prisma.business.findMany({
  //     include: {
  //       owner: true,
  //       products: true,
  //     },
  //   });
  // }

  // async findOne(id: string) {
  //   const business = await this.prisma.business.findUnique({
  //     where: { id },
  //     include: {
  //       owner: true,
  //       products: true,
  //     },
  //   });

  //   if (!business) {
  //     throw new NotFoundException('BUSSINESS_NOT_FOUND');
  //   }

  //   return business;
  // }

  async update(id: string, dto: UpdateBusinessDto) {
    return await this.prisma.business.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        address: dto.address,
        owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      },
    });
  }

}
