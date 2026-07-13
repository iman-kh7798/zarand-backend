import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleService } from 'src/role/role.service';
import { UserService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private roleService: RoleService,
    private jwtService: JwtService,
  ) {}

  testPhone = ['09212921488', '09376551218'];

  async signIn(phone: string, pass: string): Promise<any> {
    const user = await this.usersService.validateUser(phone, pass);
    if (!user) {
      throw new UnauthorizedException();
    }
    const role = await this.roleService.findOne(user.roleId);
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: role.name,
      name: user.name ?? '',
    };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async signUp(name: string, phone: string, pass: string): Promise<any> {
    let user:
      | { phone: string; roleId: number; id: string; name: string | null }
      | undefined;
    try {
      user = await this.usersService.create({
        phone: phone,
        roleId: 2,
        password: pass,
        name: name,
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === 'P2002') {
        throw new BadRequestException('PHONE_EXISTS');
      }
    }

    if (!user) {
      throw new ServiceUnavailableException('UNABLE_TOO_CREATE_USER');
    }
    const role = await this.roleService.findOne(user.roleId);
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: role.name,
      name: user.name ?? '',
    };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async sendPhone(phone: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (this.testPhone.includes(phone)) {
      return { code: '123456' };
    }
    return this.usersService.saveVerificationCode(phone, code);
  }

  async verifyCode(phone: string, code: string) {
    let isNewUser: boolean = false;
    const isTestOtp = this.testPhone.includes(phone) && code === '123456';
    const otp = await this.usersService.findValidOtp(phone, code);
    if (!otp && !isTestOtp) {
      throw new UnauthorizedException('INVALID_OR_EXPIRED_CODE');
    }
    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      user = await this.usersService.create({
        phone,
        roleId: 2,
        password: Math.random().toString(36).slice(-8), // رمز تصادفی برای کاربران جدید
        name: null,
      });
      isNewUser = true;
    }
    await this.usersService.expireValidOtp(phone);
    const role = await this.roleService.findOne(user.roleId);
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: role.name,
      name: user.name ?? '',
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      isNewUser,
    };
  }
}
