import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleService } from 'src/role/role.service';
import { UserService } from 'src/users/users.service';
import { SendCodeDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private roleService: RoleService,
    private jwtService: JwtService,
  ) {}

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
  async sendCode({ phone, code, type }: SendCodeDto) {
    // حس نمی کنی بهتره این رو بفرستیم به سرویس otp

    await this.usersService.saveVerificationCode(phone, code, type);
  }
}
