import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn(phone: string, pass: string): Promise<any> {
    const user = await this.usersService.validateUser(phone, pass);
    if (!user) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.id, phone: user.phone, role: user.roleId };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
