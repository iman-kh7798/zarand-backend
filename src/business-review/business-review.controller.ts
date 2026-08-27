import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BusinessReviewService } from './business-review.service';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { UpdateBusinessReviewDto } from './dto/update-business-review.dto';
import { ListBusinessReviewsDto } from './dto/list-business-reviews.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { OptionalAuthGuard } from 'src/auth/optional.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
export class BusinessReviewController {
  constructor(private service: BusinessReviewService) {}

  // Create a review for a business (authenticated users only).
  // نظر جدید در حالت «در انتظار تایید» ثبت می‌شود.
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @Post('business/:businessId/reviews')
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessReviewDto,
    @Req() req: { user: { sub: string } },
  ) {
    const userId = req.user?.sub;
    return this.service.createOrUpdate(businessId, userId, dto);
  }

  // List reviews + average and count.
  // عمومی است ولی فقط نظرهای تاییدشده را برمی‌گرداند؛
  // کاربر لاگین‌کرده نظر خودش را در حالت در انتظار تایید هم می‌بیند.
  @ApiBearerAuth('access-token')
  @UseGuards(OptionalAuthGuard)
  @Get('business/:businessId/reviews')
  async list(
    @Param('businessId') businessId: string,
    @Req() req: { user?: { sub: string } },
  ) {
    return this.service.listByBusiness(businessId, req.user?.sub);
  }

  // لیست نظرها برای مدیریت: مالک فقط کسب‌وکارهای خودش، ادمین همه
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @Get('reviews')
  async listForModeration(
    @Req() req: { user: { sub: string; role: Role } },
    @Query() query: ListBusinessReviewsDto,
  ) {
    return this.service.listForModeration(req.user, query);
  }

  // تایید یا رد کردن نظر
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @Patch('reviews/:id/status')
  async setApproval(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
    @Req() req: { user: { sub: string; role: Role } },
  ) {
    return this.service.setApproval(id, dto.isApproved, req.user);
  }

  // Update a review (only owner of review)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @Put('reviews/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessReviewDto,
    @Req() req: { user: { sub: string } },
  ) {
    const userId = req.user?.sub;
    return this.service.update(id, userId, dto);
  }

  // Delete a review (only owner of review)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner, Role.Admin)
  @Delete('reviews/:id')
  async remove(@Param('id') id: string, @Req() req: { user: { sub: string } }) {
    const userId = req.user?.sub;
    return this.service.remove(id, userId);
  }
}
