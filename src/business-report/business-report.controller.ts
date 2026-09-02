import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { BusinessReportService } from './business-report.service';
import { CreateBusinessReportDto } from './dto/create-business-report.dto';
import { ListBusinessReportsDto } from './dto/list-business-reports.dto';
import { UpdateBusinessReportStatusDto } from './dto/update-business-report-status.dto';
import { UpdateBusinessReportReadDto } from './dto/update-business-report-read.dto';

@Controller('business-reports')
export class BusinessReportController {
  constructor(private readonly service: BusinessReportService) {}

  // ثبت گزارش اصلاح اطلاعات — عمومی، بدون نیاز به لاگین
  @Post()
  create(@Body() dto: CreateBusinessReportDto) {
    return this.service.create(dto);
  }

  // لیست گزارش‌ها: مالک فقط کسب‌وکارهای خودش، ادمین همه
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Get()
  findAll(
    @Req() req: { user: { sub: string; role: Role } },
    @Query() query: ListBusinessReportsDto,
  ) {
    return this.service.findAll(req.user, query);
  }

  // مشاهده یک گزارش
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { sub: string; role: Role } },
  ) {
    return this.service.findOne(id, req.user);
  }

  // تغییر وضعیت رسیدگی
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessReportStatusDto,
    @Req() req: { user: { sub: string; role: Role } },
  ) {
    return this.service.setStatus(id, dto.status, req.user);
  }

  // علامت‌گذاری خوانده‌شده / خوانده‌نشده
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @Patch(':id/read')
  setRead(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessReportReadDto,
    @Req() req: { user: { sub: string; role: Role } },
  ) {
    return this.service.setRead(id, dto.isRead, req.user);
  }

  // حذف گزارش — فقط ادمین
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
