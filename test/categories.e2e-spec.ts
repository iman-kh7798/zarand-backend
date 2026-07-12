import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { CategoriesController } from '../src/categories/categories.controller';
import { CategoriesService } from '../src/categories/categories.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { RolesGuard } from '../src/role/role.guard';
import { Role } from '../src/role/role.enum';
import { jwtConstants } from '../src/auth/constants';

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let categoriesService: { [K in keyof CategoriesService]?: jest.Mock };
  let jwtService: JwtService;
  let ownerToken: string;
  let userToken: string;

  beforeAll(async () => {
    categoriesService = {
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: categoriesService },
        AuthGuard,
        RolesGuard,
        JwtService,
        {
          provide: 'JWT_MODULE_OPTIONS',
          useValue: { secret: jwtConstants.secret },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = new JwtService({ secret: jwtConstants.secret });
    ownerToken = await jwtService.signAsync({
      sub: 'owner-1',
      role: Role.Owner,
    });
    userToken = await jwtService.signAsync({
      sub: 'user-1',
      role: Role.User,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /categories', () => {
    it('returns categories without requiring authentication', async () => {
      categoriesService.findAll!.mockResolvedValue([{ id: 'cat-1' }]);

      await request(app.getHttpServer())
        .get('/categories')
        .expect(200)
        .expect([{ id: 'cat-1' }]);
    });
  });

  describe('GET /categories/:id', () => {
    it('returns a single category', async () => {
      categoriesService.findOne!.mockResolvedValue({ id: 'cat-1' });

      await request(app.getHttpServer())
        .get('/categories/cat-1')
        .expect(200)
        .expect({ id: 'cat-1' });
    });

    it('returns 404 when the service throws NotFoundException', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      categoriesService.findOne!.mockRejectedValue(
        new NotFoundException('CATEGORY_NOT_FOUND'),
      );

      await request(app.getHttpServer())
        .get('/categories/missing')
        .expect(404);
    });
  });

  describe('POST /categories', () => {
    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Electronics', slug: 'electronics' })
        .expect(401);

      expect(categoriesService.create).not.toHaveBeenCalled();
    });

    it('returns 403 when the authenticated user is not an Owner', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Electronics', slug: 'electronics' })
        .expect(403);

      expect(categoriesService.create).not.toHaveBeenCalled();
    });

    it('creates a category for an authenticated Owner', async () => {
      categoriesService.create!.mockResolvedValue({ id: 'cat-1' });

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Electronics', slug: 'electronics' })
        .expect(201)
        .expect({ id: 'cat-1' });

      expect(categoriesService.create).toHaveBeenCalledWith({
        name: 'Electronics',
        slug: 'electronics',
      });
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Electronics' })
        .expect(400);

      expect(categoriesService.create).not.toHaveBeenCalled();
    });

    it('returns 400 for unknown extra fields', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Electronics', slug: 'electronics', extra: 'nope' })
        .expect(400);

      expect(categoriesService.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /categories/:id', () => {
    it('updates a category for an authenticated Owner', async () => {
      categoriesService.update!.mockResolvedValue({
        id: 'cat-1',
        name: 'Updated',
      });

      await request(app.getHttpServer())
        .patch('/categories/cat-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated' })
        .expect(200)
        .expect({ id: 'cat-1', name: 'Updated' });
    });

    it('returns 403 for a non-Owner user', async () => {
      await request(app.getHttpServer())
        .patch('/categories/cat-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('deletes a category for an authenticated Owner', async () => {
      categoriesService.delete!.mockResolvedValue({ id: 'cat-1' });

      await request(app.getHttpServer())
        .delete('/categories/cat-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete('/categories/cat-1')
        .expect(401);
    });
  });

  describe('POST /categories/business/add', () => {
    it('returns 400 when businessId is missing', async () => {
      await request(app.getHttpServer())
        .post('/categories/business/add')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ categoryId: 'cat-1' })
        .expect(400);
    });

    it('links a business to a category for an authenticated Owner', async () => {
      categoriesService.addBusinessToCategory!.mockResolvedValue({
        businessId: 'biz-1',
        categoryId: 'cat-1',
      });

      await request(app.getHttpServer())
        .post('/categories/business/add')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ businessId: 'biz-1', categoryId: 'cat-1' })
        .expect(201);
    });
  });

  describe('GET /categories/business/:businessId', () => {
    it('is publicly accessible', async () => {
      categoriesService.getCategoriesByBusiness!.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/categories/business/biz-1')
        .expect(200)
        .expect([]);
    });
  });

  describe('PATCH /categories/product/:productId', () => {
    it('returns 400 when categoryId is missing', async () => {
      await request(app.getHttpServer())
        .patch('/categories/product/prod-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
    });

    it('updates the product category for an authenticated Owner', async () => {
      categoriesService.updateProductCategory!.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
      });

      await request(app.getHttpServer())
        .patch('/categories/product/prod-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ categoryId: 'cat-1' })
        .expect(200);
    });
  });

  describe('DELETE /categories/product/:productId', () => {
    it('returns 403 for a non-Owner user', async () => {
      await request(app.getHttpServer())
        .delete('/categories/product/prod-1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
