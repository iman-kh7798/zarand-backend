import { Test, TestingModule } from '@nestjs/testing';
import { BusinessImageController } from './business-image.controller';
import { BusinessImageService } from './business-image.service';

describe('BusinessImageController', () => {
  let controller: BusinessImageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessImageController],
      providers: [BusinessImageService],
    }).compile();

    controller = module.get<BusinessImageController>(BusinessImageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
