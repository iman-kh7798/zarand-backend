import { Module } from '@nestjs/common';
import { FavoriteBusinessController } from './favorite-business.controller';
import { FavoriteBusinessService } from './favorite-business.service';

@Module({
  controllers: [FavoriteBusinessController],
  providers: [FavoriteBusinessService],
  exports: [FavoriteBusinessService],
})
export class FavoriteBusinessModule {}
