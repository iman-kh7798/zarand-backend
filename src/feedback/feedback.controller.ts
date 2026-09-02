import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ListFeedbackDto } from './dto/list-feedback.dto';
import { UpdateFeedbackReadDto } from './dto/update-feedback-read.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // ثبت پیشنهاد و بازخورد — عمومی، بدون نیاز به لاگین
  // ضد اسپم: ۵ ثبت در ۱۰ دقیقه به‌ازای هر IP
  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  @Post()
  create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(dto);
  }

  // لیست پیشنهادها برای پنل مدیریت
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  findAll(@Query() query: ListFeedbackDto) {
    return this.feedbackService.findAll(query);
  }

  // مشاهده یک پیشنهاد
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  // علامت‌گذاری خوانده‌شده / خوانده‌نشده
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/read')
  setRead(@Param('id') id: string, @Body() dto: UpdateFeedbackReadDto) {
    return this.feedbackService.setRead(id, dto.isRead);
  }

  // حذف پیشنهاد
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feedbackService.remove(id);
  }
}
