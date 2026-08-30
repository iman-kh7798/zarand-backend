/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto, UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { SmsService } from 'src/sms/sms.service';
import { UpdateProductDto } from 'src/products/dto/update-product.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
  ) {}

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

  async findByPhone(phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });
    if (!user) return null;

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
        name: dto.name,
        phone: dto.phone,
        role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
        // فقط وقتی پسورد جدید داریم، این فیلد رو ست کن
        ...(passwordHash && { passwordHash }),
        ...(dto.email ? { email: dto.email } : {}),
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

  async saveVerificationCode(phone: string, code: string) {
    const existingCode = await this.prisma.otp.findFirst({
      where: {
        phone,
        expiresAt: {
          gt: new Date(), // فقط کدهای معتبر (غیر منقضی) رو چک کن
        },
      },
    });

    if (existingCode) {
      return { message: 'A valid code already exists for this phone number' };
    }
    await this.prisma.otp.create({
      data: {
        phone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // کد 5 دقیقه اعتبار داره
      },
    });
    // اینجا فقط ذخیره‌سازی انجام میشه، ارسال کد به کاربر رو باید با سرویس دیگه‌ای انجام بدی

    // بیا فعلا برای تست کد رو بفرستیم به کاربر همینجا
    this.smsService.sendCode(phone, code);
    return { message: `Verification code sent code: ${code}` };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        name: dto.name,
        // فقط وقتی پسورد جدید داریم، این فیلد رو ست کن
      },
      include: {
        role: true,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async findValidOtp(phone: string, code: string) {
    const otp = await this.prisma.otp.findFirst({
      where: {
        phone,
        code,
        expiresAt: {
          gt: new Date(), // فقط کدهای معتبر (غیر منقضی) رو چک کن
        },
      },
    });

    return otp;
  }
  async expireValidOtp(phone: string) {
    await this.prisma.otp.updateMany({
      where: {
        phone,
        expiresAt: {
          gt: new Date(), // فقط کدهای معتبر (غیر منقضی) رو منقضی کن
        },
      },
      data: {
        expiresAt: new Date(), // با تنظیم زمان انقضای کد به زمان فعلی، اون رو منقضی می‌کنیم
      },
    });
  }
}
