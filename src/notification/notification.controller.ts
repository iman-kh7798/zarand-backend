import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { AuthGuard } from 'src/auth/auth.guard';
import { SseAuthGuard } from 'src/auth/sse.guard';
import { NotificationEventsService } from './notification-events.service';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { RolesGuard } from 'src/role/role.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  ListMyNotificationsDto,
  ListNotificationsDto,
} from './dto/list-notifications.dto';
import { RejectNotificationDto } from './dto/reject-notification.dto';
import { NotificationService } from './notification.service';

type AuthedRequest = { user: { sub: string; role: Role } };

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly events: NotificationEventsService,
  ) {}

  /**
   * کانال زنده‌ی اعلان‌ها (SSE) — جایگزین polling.
   *
   * چون `EventSource` مرورگر هدر نمی‌فرستد، توکن را می‌توان با
   * `?token=<jwt>` هم داد (`SseAuthGuard`). رویدادها: `connected`،
   * `notification`، `read`، `read-all` و `ping` (هر ۲۵ ثانیه برای
   * زنده‌نگه‌داشتن اتصال پشت پروکسی).
   */
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'JWT — برای EventSource که هدر Authorization نمی‌فرستد',
  })
  @SkipThrottle()
  @UseGuards(SseAuthGuard)
  // جلوگیری از بافر شدن استریم توسط پروکسی (nginx/cPanel)
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @Header('Connection', 'keep-alive')
  @Sse('me/stream')
  stream(@Req() req: AuthedRequest): Observable<MessageEvent> {
    return this.events.streamFor(req.user.sub);
  }

  // ---- صندوق کاربر جاری (مسیرهای me قبل از :id تعریف شده‌اند) ----

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Get('me')
  findMine(@Req() req: AuthedRequest, @Query() query: ListMyNotificationsDto) {
    return this.service.findMine(req.user.sub, query);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Get('me/unread-count')
  unreadCount(@Req() req: AuthedRequest) {
    return this.service.unreadCount(req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Patch('me/read-all')
  markAllRead(@Req() req: AuthedRequest) {
    return this.service.markAllRead(req.user.sub);
  }

  // `id` شناسه‌ی ردیف صندوق کاربر است، نه شناسه‌ی خود اعلان
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @Patch('me/:id/read')
  markRead(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.service.markRead(id, req.user.sub);
  }

  // ---- ساخت و مدیریت اعلان ----

  // ادمین: بلافاصله ارسال می‌شود. مالک: در انتظار تایید ادمین می‌ماند.
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateNotificationDto) {
    return this.service.createByUser(req.user, dto);
  }

  // ادمین همه را می‌بیند، مالک فقط اعلان‌های ساخته‌ی خودش را
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Get()
  findAll(@Req() req: AuthedRequest, @Query() query: ListNotificationsDto) {
    return this.service.findAll(req.user, query);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.service.findOne(id, req.user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.service.approve(id, req.user.sub);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectNotificationDto,
    @Req() req: AuthedRequest,
  ) {
    return this.service.reject(id, req.user.sub, dto.reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
