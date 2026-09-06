import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { jwtConstants } from './constants';

/**
 * گارد مخصوص مسیرهای SSE.
 *
 * چرا جدا از AuthGuard: `EventSource` مرورگر اجازه‌ی فرستادن هدر
 * `Authorization` را نمی‌دهد، پس توکن از query هم پذیرفته می‌شود
 * (`?token=...`). بقیه‌ی مسیرها همچنان فقط هدر را قبول می‌کنند تا
 * توکن بی‌دلیل در URL و لاگ‌ها پخش نشود.
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    try {
      request['user'] = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, headerToken] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && headerToken) return headerToken;

    const queryToken = request.query?.token;
    return typeof queryToken === 'string' && queryToken ? queryToken : undefined;
  }
}
