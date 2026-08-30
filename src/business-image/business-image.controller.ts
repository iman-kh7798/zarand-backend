import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BusinessImageService } from './business-image.service';
import { CreateBusinessImageDto } from './dto/create-business-image.dto';
import { UpdateBusinessImageDto } from './dto/update-business-image.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(AuthGuard, RolesGuard)
@Controller('business-image')
export class BusinessImageController {
  constructor(private readonly businessImageService: BusinessImageService) {}
  @ApiBearerAuth('access-token')
  @Roles(Role.Owner, Role.Admin)
  @Post()
  create(@Body() createBusinessImageDto: CreateBusinessImageDto) {
    return this.businessImageService.create(createBusinessImageDto);
  }

  @Get()
  findAll() {
    return this.businessImageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessImageService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.Owner, Role.Admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBusinessImageDto: UpdateBusinessImageDto,
  ) {
    return this.businessImageService.update(id, updateBusinessImageDto);
  }
  @ApiBearerAuth('access-token')
  @Roles(Role.Owner, Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessImageService.remove(id);
  }
}
