import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { CreateRoleDto } from './dto/create-role.dto';
// import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  // async create(dto: CreateRoleDto) {
  //   return this.prisma.role.create({
  //     data: {
  //       name: dto.name,
  //       description: dto.description,
  //     },
  //   });
  // }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        users: true,
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // async update(id: number, dto: UpdateRoleDto) {
  //   return this.prisma.role.update({
  //     where: { id },
  //     data: {
  //       name: dto.name,
  //       description: dto.description,
  //     },
  //   });
  // }

  // async remove(id: number) {
  //   return this.prisma.role.delete({
  //     where: { id },
  //   });
  // }
}
