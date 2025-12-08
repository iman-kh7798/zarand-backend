/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBusinessByUserDto,
  CreateBusinessDto,
} from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UserService } from 'src/users/users.service';

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private users: UserService,
  ) {}

  async create(dto: CreateBusinessDto) {
    try {
      return await this.prisma.business.create({
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          owner: { connect: { id: dto.ownerId } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('USER_NOT_EXISTS');
      }
      throw error;
    }
  }

  async createBussinessByUser(dto: CreateBusinessByUserDto) {
    let user;

    try {
      user = await this.users.create({
        phone: dto.phone,
        roleId: 2,
        password: dto.password,
        name: dto.name,
        email: dto.email,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new BadRequestException('PHONE_EXISTS');
      }
    }

    if (!user) {
      throw new ServiceUnavailableException('UNABLE_TOO_CREATE_USER');
    }

    try {
      return await this.prisma.business.create({
        data: {
          title: dto.title,
          description: dto.description,
          address: dto.address as string,
          phone: dto.phone,
          owner: { connect: { id: user.id } },
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

  async remove(id: string) {
    return await this.prisma.business.delete({
      where: { id },
    });
  }
}
