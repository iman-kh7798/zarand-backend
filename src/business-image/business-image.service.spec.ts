import { Test, TestingModule } from '@nestjs/testing';
import { BusinessImageService } from './business-image.service';

describe('BusinessImageService', () => {
  let service: BusinessImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessImageService],
    }).compile();

    service = module.get<BusinessImageService>(BusinessImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
