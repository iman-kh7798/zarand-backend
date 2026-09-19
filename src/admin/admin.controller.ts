import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { AdminService } from './admin.service';

const COUNT_SCHEMA = { type: 'number' } as const;

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'آمار کلی برای داشبورد ادمین',
    description:
      'همه‌ی شمارش‌های لازم برای داشبورد ادمین را در یک درخواست برمی‌گرداند ' +
      '(به‌جای چند درخواست take=1 روی لیست‌های جداگانه که قبلاً در پنل استفاده می‌شد).',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        businesses: {
          type: 'object',
          properties: {
            total: COUNT_SCHEMA,
            pending: COUNT_SCHEMA,
            approved: COUNT_SCHEMA,
            rejected: COUNT_SCHEMA,
          },
        },
        reviews: {
          type: 'object',
          properties: { pending: COUNT_SCHEMA },
        },
        feedback: {
          type: 'object',
          properties: { total: COUNT_SCHEMA, unread: COUNT_SCHEMA },
        },
        businessReports: {
          type: 'object',
          properties: {
            total: COUNT_SCHEMA,
            unread: COUNT_SCHEMA,
            pending: COUNT_SCHEMA,
          },
        },
        users: {
          type: 'object',
          properties: { total: COUNT_SCHEMA },
        },
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
