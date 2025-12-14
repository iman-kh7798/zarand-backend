import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'src/role/role.enum';

@Injectable()
export class BusinessOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (user?.role === Role.ADMIN) return true;

    const businessId = Number(req.params.id);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) throw new ForbiddenException('Business not found');
    if (business.ownerId !== user.id)
      throw new ForbiddenException('Not your business');

    return true;
  }
}
