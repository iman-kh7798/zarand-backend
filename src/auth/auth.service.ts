import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // مرحله ۱: ارسال OTP
  async sendOtp(phone: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // ۶ رقمی
    const expires = new Date(Date.now() + 2 * 60 * 1000); // دو دقیقه

    await this.prisma.otp.create({
      data: {
        phone,
        code,
        expiresAt: expires,
      },
    });

    // فعلاً برای تست خود کد رو برگردونیم (بعداً SMS Gateway)
    return { phone, code, expiresAt: expires };
  }

  // مرحله ۲: تایید OTP
  async verifyOtp(phone: string, code: string) {
    const record = await this.prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException('OTP not found');
    }

    if (record.code !== code) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired');
    }

    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    // اگر یوزر وجود ندارد → بسازیم
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          passwordHash: '',
          role: { connect: { id: 3 } }, // customer
        },
      });
    }

    // تولید JWT
    const token = await this.jwt.signAsync({
      sub: user.id,
      phone: user.phone,
      roleId: user.roleId,
    });

    return {
      access_token: token,
      user,
    };
  }
}
