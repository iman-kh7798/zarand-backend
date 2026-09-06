import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogCategoryService } from './blog-category.service';
import { UploadService } from '../upload/upload.service';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional.guard';
import { RolesGuard } from '../role/role.guard';
import { Role } from '../role/role.enum';
import { jwtConstants } from '../auth/constants';

/**
 * تست‌های HTTP کنترلر بلاگ. سرویس‌ها mock هستند؛ هدف تأیید مسیرها،
 * گاردها (ادمین‌بودن) و اعتبارسنجی ورودی با همان ValidationPipe سراسری است.
 */
describe('BlogController (HTTP)', () => {
  let app: INestApplication<App>;
  let blogService: { [K in keyof BlogService]?: jest.Mock };
  let blogCategoryService: { [K in keyof BlogCategoryService]?: jest.Mock };
  let adminToken: string;
  let ownerToken: string;

  const validPost = {
    title: 'A Complete Guide to Visiting Zarand',
    excerpt:
      'Everything a first-time visitor needs: where to stay, what to eat and see.',
    content:
      '<p>Zarand is a city in Kerman province. This guide walks through the highlights for a weekend trip.</p>',
    authorName: 'Editorial Team',
    status: 'PUBLISHED',
  };

  beforeAll(async () => {
    blogService = {
      list: jest.fn(),
      listForAdmin: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    blogCategoryService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        { provide: BlogService, useValue: blogService },
        { provide: BlogCategoryService, useValue: blogCategoryService },
        { provide: UploadService, useValue: { create: jest.fn() } },
        AuthGuard,
        OptionalAuthGuard,
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

    const jwtService = new JwtService({ secret: jwtConstants.secret });
    adminToken = await jwtService.signAsync({
      sub: 'admin-1',
      role: Role.Admin,
    });
    ownerToken = await jwtService.signAsync({
      sub: 'owner-1',
      role: Role.Owner,
    });
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  describe('GET /blog', () => {
    it('is public and returns the paginated list from the service', async () => {
      blogService.list!.mockResolvedValue({
        posts: [{ id: 'p1' }],
        page: { total: 1, take: 10, skip: 0 },
      });

      await request(app.getHttpServer())
        .get('/blog')
        .expect(200)
        .expect({
          posts: [{ id: 'p1' }],
          page: { total: 1, take: 10, skip: 0 },
        });
    });

    it('rejects an out-of-range take with 400', async () => {
      await request(app.getHttpServer())
        .get('/blog')
        .query({ take: 999 })
        .expect(400);

      expect(blogService.list).not.toHaveBeenCalled();
    });
  });

  describe('GET /blog/admin', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/blog/admin').expect(401);

      expect(blogService.listForAdmin).not.toHaveBeenCalled();
    });

    it('returns 403 for a non-admin (owner) token', async () => {
      await request(app.getHttpServer())
        .get('/blog/admin')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(blogService.listForAdmin).not.toHaveBeenCalled();
    });

    it('lists drafts for an admin and returns the same shape as GET /blog', async () => {
      blogService.listForAdmin!.mockResolvedValue({
        posts: [{ id: 'p1', status: 'DRAFT' }],
        page: { total: 1, take: 10, skip: 0 },
      });

      await request(app.getHttpServer())
        .get('/blog/admin')
        .query({ status: 'DRAFT' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect({
          posts: [{ id: 'p1', status: 'DRAFT' }],
          page: { total: 1, take: 10, skip: 0 },
        });

      expect(blogService.listForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' }),
      );
    });

    it('passes categoryId through to the service', async () => {
      const categoryId = '6fc72850-f4c9-439a-a20c-626b1911631a';
      blogService.listForAdmin!.mockResolvedValue({
        posts: [],
        page: { total: 0, take: 10, skip: 0 },
      });

      await request(app.getHttpServer())
        .get('/blog/admin')
        .query({ categoryId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(blogService.listForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId }),
      );
    });

    it('rejects an invalid status with 400', async () => {
      await request(app.getHttpServer())
        .get('/blog/admin')
        .query({ status: 'ARCHIVED' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(blogService.listForAdmin).not.toHaveBeenCalled();
    });
  });

  describe('GET /blog/categories', () => {
    it('is public and lists categories', async () => {
      blogCategoryService.findAll!.mockResolvedValue([{ id: 'c1' }]);

      await request(app.getHttpServer())
        .get('/blog/categories')
        .expect(200)
        .expect([{ id: 'c1' }]);
    });
  });

  describe('GET /blog/:idOrSlug', () => {
    it('returns 404 when the service reports a missing post', async () => {
      blogService.findOne!.mockRejectedValue(
        new NotFoundException('BLOG_POST_NOT_FOUND'),
      );

      await request(app.getHttpServer())
        .get('/blog/no-such-article')
        .expect(404);
    });

    it('returns the post for an existing slug', async () => {
      blogService.findOne!.mockResolvedValue({ id: 'p1', slug: 'hello' });

      await request(app.getHttpServer())
        .get('/blog/hello')
        .expect(200)
        .expect({ id: 'p1', slug: 'hello' });
    });

    it('accepts a post id too (used by the admin edit form)', async () => {
      const id = '6fc72850-f4c9-439a-a20c-626b1911631a';
      blogService.findOne!.mockResolvedValue({ id, slug: 'hello' });

      await request(app.getHttpServer()).get(`/blog/${id}`).expect(200);

      expect(blogService.findOne).toHaveBeenCalledWith(id, undefined);
    });
  });

  describe('POST /blog', () => {
    it('creates a post for an authenticated admin with valid data', async () => {
      blogService.create!.mockResolvedValue({ id: 'p1', ...validPost });

      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPost)
        .expect(201);

      expect(blogService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: validPost.title }),
      );
    });

    it('returns 400 when the title is shorter than 5 characters', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPost, title: 'abc' })
        .expect(400);

      expect(blogService.create).not.toHaveBeenCalled();
    });

    it('returns 400 for unknown extra fields', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPost, somethingElse: 'nope' })
        .expect(400);

      expect(blogService.create).not.toHaveBeenCalled();
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .send(validPost)
        .expect(401);

      expect(blogService.create).not.toHaveBeenCalled();
    });

    it('returns 403 for a non-admin (owner) token', async () => {
      await request(app.getHttpServer())
        .post('/blog')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validPost)
        .expect(403);

      expect(blogService.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /blog/categories/:id', () => {
    it('propagates the "category still has posts" error as 400', async () => {
      blogCategoryService.remove!.mockRejectedValue(
        new BadRequestException('BLOG_CATEGORY_HAS_POSTS'),
      );

      await request(app.getHttpServer())
        .delete('/blog/categories/c1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('returns 403 for a non-admin token', async () => {
      await request(app.getHttpServer())
        .delete('/blog/categories/c1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(blogCategoryService.remove).not.toHaveBeenCalled();
    });
  });
});
