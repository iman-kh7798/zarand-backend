import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { BusinessEventService } from './business-event.service';
import { CreateBusinessEventDto } from './dto/create-business-event.dto';
import { BusinessEventStatsQueryDto } from './dto/business-event-stats-query.dto';

const TYPE_COUNTS_SCHEMA = {
  type: 'object',
  properties: {
    profileView: { type: 'number' },
    phoneClick: { type: 'number' },
    socialClick: { type: 'number' },
  },
} as const;

@ApiTags('business-event')
@Controller()
export class BusinessEventController {
  constructor(private readonly service: BusinessEventService) {}

  // این مسیر (GET business/stats) عمداً در BusinessEventModule قبل از BusinessModule
  // import شده تا زودتر از مسیر `GET business/:id` ثبت شود — وگرنه Express آن را
  // به‌عنوان id="stats" به findOne کسب‌وکار می‌فرستد. اگر این ترتیب import عوض شود
  // این مسیر می‌شکند.
  @ApiOperation({
    summary: 'آمار کسب‌وکار خودِ مالک (فقط OWNER)',
    description:
      'کسب‌وکار از روی توکن resolve می‌شود، نه پارامتر (هر مالک فقط یک ' +
      'کسب‌وکار دارد). `totals` = مجموع هر نوع رویداد در بازه؛ برای `range=all` ' +
      'کل تاریخچه است. `series` = شمارش روزانه با محور زمانی پیوسته (روزهای ' +
      'بدون رویداد هم با صفر برمی‌گردند)؛ برای `range=all` به آخرین ۹۰ روز ' +
      'محدود می‌شود تا حجم پاسخ نامحدود نشود.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        totals: TYPE_COUNTS_SCHEMA,
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2026-09-10' },
              ...TYPE_COUNTS_SCHEMA.properties,
            },
          },
        },
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Get('business/stats')
  getMyStats(
    @Query() query: BusinessEventStatsQueryDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.service.getMyStats(req.user.sub, query.range);
  }

  @ApiOperation({
    summary: 'ثبت رویداد سبک روی پروفایل کسب‌وکار (عمومی)',
    description:
      'بدون نیاز به لاگین. اگر همین `visitorId` همین `type` را برای همین ' +
      'کسب‌وکار در ۲۴ ساعت اخیر ثبت کرده باشد، رکورد جدیدی ساخته نمی‌شود ولی ' +
      'باز هم پاسخ موفق برمی‌گردد. محدودیت نرخ: ۳۰ درخواست در دقیقه به‌ازای هر IP.',
  })
  @ApiParam({ name: 'id', description: 'شناسه‌ی کسب‌وکار' })
  @ApiCreatedResponse({
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('business/:id/events')
  create(@Param('id') id: string, @Body() dto: CreateBusinessEventDto) {
    return this.service.create(id, dto);
  }
}
