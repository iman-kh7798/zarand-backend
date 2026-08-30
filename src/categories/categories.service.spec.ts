import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from 'src/prisma/prisma.service';

type MockPrisma = {
  category: { [K in keyof any]?: jest.Mock } & Record<string, jest.Mock>;
  business: Record<string, jest.Mock>;
  businessCategory: Record<string, jest.Mock>;
  product: Record<string, jest.Mock>;
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: MockPrisma;

  const category = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: undefined,
    parentId: undefined,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      business: {
        findUnique: jest.fn(),
      },
      businessCategory: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a category with the provided fields', async () => {
      prisma.category.create.mockResolvedValue(category);

      const result = await service.create({
        name: 'Electronics',
        slug: 'electronics',
      });

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Electronics',
            slug: 'electronics',
          }),
        }),
      );
      expect(result).toEqual(category);
    });
  });

  describe('findAll', () => {
    it('returns every category with relations included', async () => {
      prisma.category.findMany.mockResolvedValue([category]);

      const result = await service.findAll();

      expect(result).toEqual([category]);
    });
  });

  describe('findOne', () => {
    it('returns the category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findOne('cat-1');

      expect(result).toEqual(category);
    });

    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a category when it exists and is not its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.category.update.mockResolvedValue({
        ...category,
        name: 'Updated',
      });

      const result = await service.update('cat-1', { name: 'Updated' });

      expect(result).toEqual({ ...category, name: 'Updated' });
    });

    it('throws NotFoundException when updating a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when parentId equals its own id', async () => {
      prisma.category.findUnique.mockResolvedValue(category);

      await expect(
        service.update('cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes an existing category', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.category.delete.mockResolvedValue(category);

      const result = await service.delete('cat-1');

      expect(result).toEqual(category);
    });

    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addBusinessToCategory', () => {
    it('links an existing business to an existing category', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1' });
      prisma.businessCategory.create.mockResolvedValue({
        businessId: 'biz-1',
        categoryId: 'cat-1',
      });

      const result = await service.addBusinessToCategory({
        businessId: 'biz-1',
        categoryId: 'cat-1',
      });

      expect(result).toEqual({ businessId: 'biz-1', categoryId: 'cat-1' });
    });

    it('throws NotFoundException when the category is missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.addBusinessToCategory({
          businessId: 'biz-1',
          categoryId: 'missing',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the business is missing', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.addBusinessToCategory({
          businessId: 'missing',
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeBusinessFromCategory', () => {
    it('removes an existing business-category association', async () => {
      prisma.businessCategory.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        categoryId: 'cat-1',
      });
      prisma.businessCategory.delete.mockResolvedValue({});

      await service.removeBusinessFromCategory({
        businessId: 'biz-1',
        categoryId: 'cat-1',
      });

      expect(prisma.businessCategory.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when the association does not exist', async () => {
      prisma.businessCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.removeBusinessFromCategory({
          businessId: 'biz-1',
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBusinessesByCategory', () => {
    it('returns businesses for a valid category', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.businessCategory.findMany.mockResolvedValue([]);

      const result = await service.getBusinessesByCategory('cat-1');

      expect(result).toEqual([]);
    });

    it('throws NotFoundException for an unknown category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.getBusinessesByCategory('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategoriesByBusiness', () => {
    it('returns categories for an existing business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1' });
      prisma.businessCategory.findMany.mockResolvedValue([]);

      const result = await service.getCategoriesByBusiness('biz-1');

      expect(result).toEqual([]);
    });

    it('throws NotFoundException when the business does not exist', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.getCategoriesByBusiness('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProductCategory', () => {
    it('assigns a category to an existing product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
      });

      const result = await service.updateProductCategory('prod-1', 'cat-1');

      expect(result).toEqual({ id: 'prod-1', categoryId: 'cat-1' });
    });

    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProductCategory('missing', 'cat-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the category does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProductCategory('prod-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeProductCategory', () => {
    it('clears the category for an existing product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        categoryId: null,
      });

      const result = await service.removeProductCategory('prod-1');

      expect(result).toEqual({ id: 'prod-1', categoryId: null });
    });

    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.removeProductCategory('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductsByCategory', () => {
    it('returns products for a valid category', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getProductsByCategory('cat-1');

      expect(result).toEqual([]);
    });

    it('throws NotFoundException for an unknown category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.getProductsByCategory('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
