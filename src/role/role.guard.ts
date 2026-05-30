// src/auth/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './role.decorator';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // نقش‌هایی که روی route ست شده‌اند
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // اگر route نقش خاصی نخواست، اجازه بده رد بشه
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request: { user: { role: Role } } = context
      .switchToHttp()
      .getRequest();
    const user = request.user; // مثلا از JWT اومده
    console.log(user, requiredRoles);

    // فرض می‌کنیم user.roles آرایه‌ای از roleهاست
    // یا اگر یک role داری، خودت تطبیق بده
    return requiredRoles.some((role) => user?.role === role);
  }
}
