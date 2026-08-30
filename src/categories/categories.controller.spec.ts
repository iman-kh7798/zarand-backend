import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: { [K in keyof CategoriesService]?: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getBusinessesByCategory: jest.fn(),
      getProductsByCategory: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addBusinessToCategory: jest.fn(),
      removeBusinessFromCategory: jest.fn(),
      getCategoriesByBusiness: jest.fn(),
      updateProductCategory: jest.fn(),
      removeProductCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to the service', () => {
    service.findAll!.mockReturnValue(['category']);

    expect(controller.findAll()).toEqual(['category']);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to the service with the id param', () => {
    service.findOne!.mockReturnValue({ id: 'cat-1' });

    expect(controller.findOne('cat-1')).toEqual({ id: 'cat-1' });
    expect(service.findOne).toHaveBeenCalledWith('cat-1');
  });

  it('getBusinessesByCategory delegates to the service', () => {
    controller.getBusinessesByCategory('cat-1');
    expect(service.getBusinessesByCategory).toHaveBeenCalledWith('cat-1');
  });

  it('getProductsByCategory delegates to the service', () => {
    controller.getProductsByCategory('cat-1');
    expect(service.getProductsByCategory).toHaveBeenCalledWith('cat-1');
  });

  it('create delegates to the service with the DTO', () => {
    const dto = { name: 'Electronics', slug: 'electronics' };
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates to the service with id and DTO', () => {
    const dto = { name: 'Updated' };
    controller.update('cat-1', dto);
    expect(service.update).toHaveBeenCalledWith('cat-1', dto);
  });

  it('delete delegates to the service with the id param', () => {
    controller.delete('cat-1');
    expect(service.delete).toHaveBeenCalledWith('cat-1');
  });

  it('addBusinessToCategory delegates to the service with the DTO', () => {
    const dto = { businessId: 'biz-1', categoryId: 'cat-1' };
    controller.addBusinessToCategory(dto);
    expect(service.addBusinessToCategory).toHaveBeenCalledWith(dto);
  });

  it('removeBusinessFromCategory delegates to the service with the DTO', () => {
    const dto = { businessId: 'biz-1', categoryId: 'cat-1' };
    controller.removeBusinessFromCategory(dto);
    expect(service.removeBusinessFromCategory).toHaveBeenCalledWith(dto);
  });

  it('getCategoriesByBusiness delegates to the service with the businessId param', () => {
    controller.getCategoriesByBusiness('biz-1');
    expect(service.getCategoriesByBusiness).toHaveBeenCalledWith('biz-1');
  });

  it('updateProductCategory delegates to the service with productId and categoryId', () => {
    controller.updateProductCategory('prod-1', { categoryId: 'cat-1' });
    expect(service.updateProductCategory).toHaveBeenCalledWith(
      'prod-1',
      'cat-1',
    );
  });

  it('removeProductCategory delegates to the service with the productId param', () => {
    controller.removeProductCategory('prod-1');
    expect(service.removeProductCategory).toHaveBeenCalledWith('prod-1');
  });
});
