import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';

@Controller('business')
export class BusinessController {
  @Get()
  get() {
    return '';
  }

  @Post()
  create() {}

  @Patch()
  update() {}

  @Delete()
  delete() {}
}
