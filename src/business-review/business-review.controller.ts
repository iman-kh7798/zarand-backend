import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BusinessReviewService } from './business-review.service';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';
import { UpdateBusinessReviewDto } from './dto/update-business-review.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
export class BusinessReviewController {
  constructor(private service: BusinessReviewService) {}

  // Create a review for a business (authenticated users only)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
  @Post('business/:businessId/reviews')
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessReviewDto,
    @Req() req: { user: { sub: string } },
  ) {
    const userId = req.user?.sub;
    return this.service.create(businessId, userId, dto);
  }

  // List reviews + average and count (public)
  @Get('business/:businessId/reviews')
  async list(@Param('businessId') businessId: string) {
    return this.service.listByBusiness(businessId);
  }

  // Update a review (only owner of review)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Owner)
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
  @Roles(Role.Owner)
  @Delete('reviews/:id')
  async remove(@Param('id') id: string, @Req() req: { user: { sub: string } }) {
    const userId = req.user?.sub;
    return this.service.remove(id, userId);
  }
}
