/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ایجاد یوزر جدید با هش پسورد
  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash, // دیگه خود پسورد خام ذخیره نمی‌کنیم
        name: dto.name,
        phone: dto.phone,
        role: { connect: { id: dto.roleId } },
      },
      include: {
        role: true,
      },
    });

    // مطمئن شو passwordHash رو به فرانت برنمی‌گردونی
    // (می‌تونیم این‌جوری strip کنیم)
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
        businesses: true,
      },
    });

    // حذف passwordHash از ریسپانس
    return users.map(({ passwordHash, ...u }) => u);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        businesses: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // اگر جایی برای لاگین لازم شد:
  async findByEmail(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  // آپدیت یوزر: اگر password فرستاده شد، هش کن؛ اگر نه، دست نزن
  async update(id: string, dto: UpdateUserDto) {
    let passwordHash: string | undefined = undefined;

    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
        // فقط وقتی پسورد جدید داریم، این فیلد رو ست کن
        ...(passwordHash && { passwordHash }),
      },
      include: {
        role: true,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
      include: {
        role: true,
      },
    });

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // این متد رو برای لاگین بعداً استفاده می‌کنی:
  async validateUser(phone: string, plainPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) return null;

    const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
    if (!isMatch) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
