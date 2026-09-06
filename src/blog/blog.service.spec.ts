/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlogPostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../role/role.enum';
import { BlogService } from './blog.service';
import { BlogCategoryService } from './blog-category.service';

/** Prisma ساختگی — فقط متدهایی که سرویس واقعاً صدا می‌زند */
function createPrismaMock() {
  return {
    blogPost: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    blogCategory: {
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('BlogService', () => {
  let service: BlogService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BlogService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('always constrains the query to PUBLISHED posts (never DRAFT)', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.findMany.mockResolvedValue([]);

      await service.list({ take: 10, skip: 0 });

      const whereArg = prisma.blogPost.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(BlogPostStatus.PUBLISHED);
      expect(prisma.blogPost.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: BlogPostStatus.PUBLISHED }),
      });
    });

    it('does not select the heavy content field for list rows', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.findMany.mockResolvedValue([]);

      await service.list({ take: 10, skip: 0 });

      const selectArg = prisma.blogPost.findMany.mock.calls[0][0].select;
      expect(selectArg.content).toBeUndefined();
      expect(selectArg.excerpt).toBe(true);
    });

    it('adds a case-insensitive title/excerpt OR filter when search is given', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.findMany.mockResolvedValue([]);

      await service.list({ take: 10, skip: 0, search: 'zarand' });

      const whereArg = prisma.blogPost.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { title: { contains: 'zarand' } },
        { excerpt: { contains: 'zarand' } },
      ]);
    });
  });

  describe('listForAdmin', () => {
    it('does not constrain by status when none is given (returns all statuses)', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.findMany.mockResolvedValue([]);

      await service.listForAdmin({ take: 10, skip: 0 });

      const args = prisma.blogPost.findMany.mock.calls[0][0];
      expect(args.where.status).toBeUndefined();
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('filters by status and categoryId when provided', async () => {
      prisma.blogPost.count.mockResolvedValue(2);
      prisma.blogPost.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const result = await service.listForAdmin({
        take: 10,
        skip: 0,
        status: BlogPostStatus.DRAFT,
        categoryId: 'cat-1',
      });

      const whereArg = prisma.blogPost.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(BlogPostStatus.DRAFT);
      expect(whereArg.categoryId).toBe('cat-1');
      expect(prisma.blogPost.count).toHaveBeenCalledWith({ where: whereArg });
      expect(result).toEqual({
        posts: [{ id: 'p1' }, { id: 'p2' }],
        page: { total: 2, take: 10, skip: 0 },
      });
    });

    it('includes the category relation and omits the heavy content field', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.findMany.mockResolvedValue([]);

      await service.listForAdmin({ take: 10, skip: 0 });

      const selectArg = prisma.blogPost.findMany.mock.calls[0][0].select;
      expect(selectArg.content).toBeUndefined();
      expect(selectArg.viewCount).toBe(true);
      expect(selectArg.status).toBe(true);
      expect(selectArg.category).toEqual({
        select: { id: true, name: true, slug: true },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when neither slug nor id matches', async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);

      await expect(service.findOne('does-not-exist')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('falls back to an id lookup when the slug lookup misses', async () => {
      const post = {
        id: '6fc72850-f4c9-439a-a20c-626b1911631a',
        slug: 'my-post',
        status: BlogPostStatus.PUBLISHED,
      };
      // اولین فراخوانی (بر اساس slug) خالی، دومین (بر اساس id) پیدا می‌کند
      prisma.blogPost.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(post);
      prisma.blogPost.update.mockResolvedValue(post);

      const result = await service.findOne(post.id);

      expect(result).toBe(post);
      expect(prisma.blogPost.findUnique).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ where: { slug: post.id } }),
      );
      expect(prisma.blogPost.findUnique).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { id: post.id } }),
      );
    });

    it('hides DRAFT posts from anonymous visitors', async () => {
      prisma.blogPost.findUnique.mockResolvedValue({
        id: 'p1',
        slug: 'draft-post',
        status: BlogPostStatus.DRAFT,
      });

      await expect(service.findOne('draft-post')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns a DRAFT post for an admin viewer without bumping viewCount', async () => {
      const post = {
        id: 'p1',
        slug: 'draft-post',
        status: BlogPostStatus.DRAFT,
      };
      prisma.blogPost.findUnique.mockResolvedValue(post);

      const result = await service.findOne('draft-post', {
        sub: 'admin-1',
        role: Role.Admin,
      });

      expect(result).toBe(post);
      expect(prisma.blogPost.update).not.toHaveBeenCalled();
    });

    it('bumps viewCount for a non-admin viewer', async () => {
      const post = {
        id: 'p1',
        slug: 'public-post',
        status: BlogPostStatus.PUBLISHED,
      };
      prisma.blogPost.findUnique.mockResolvedValue(post);
      prisma.blogPost.update.mockResolvedValue(post);

      await service.findOne('public-post');

      expect(prisma.blogPost.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { viewCount: { increment: 1 } },
      });
    });
  });

  describe('create', () => {
    it('auto-generates the slug, computes read time and sets publishedAt when PUBLISHED', async () => {
      prisma.blogPost.count.mockResolvedValue(0); // slug is free
      prisma.blogPost.create.mockImplementation(({ data }: any) => ({
        id: 'p1',
        ...data,
      }));

      const result: any = await service.create({
        title: 'A Guide to Zarand',
        excerpt:
          'Everything a first-time visitor needs to know about the city.',
        content:
          '<p>Zarand is a city in Kerman province with a long history and plenty to see.</p>',
        authorName: 'Editor',
        status: BlogPostStatus.PUBLISHED,
      });

      expect(result.slug).toBe('a-guide-to-zarand');
      expect(result.readTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(result.publishedAt).toBeInstanceOf(Date);
      expect(result.status).toBe(BlogPostStatus.PUBLISHED);
    });

    it('leaves publishedAt null for a DRAFT (default status)', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.create.mockImplementation(({ data }: any) => ({
        id: 'p1',
        ...data,
      }));

      const result: any = await service.create({
        title: 'Draft article about local food',
        excerpt:
          'A work-in-progress piece about restaurants and cafes downtown.',
        content:
          '<p>This is a draft and should not be visible on the public blog yet.</p>',
        authorName: 'Editor',
      });

      expect(result.status).toBe(BlogPostStatus.DRAFT);
      expect(result.publishedAt).toBeNull();
    });

    it('accepts a DRAFT with only a title (empty excerpt/content/author default to "")', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.create.mockImplementation(({ data }: any) => ({
        id: 'p1',
        ...data,
      }));

      const result: any = await service.create({
        title: 'Bare draft with just a title',
      });

      expect(result.status).toBe(BlogPostStatus.DRAFT);
      expect(result.excerpt).toBe('');
      expect(result.content).toBe('');
      expect(result.authorName).toBe('');
      expect(result.publishedAt).toBeNull();
    });

    it('strips <script> tags from the content before saving', async () => {
      prisma.blogPost.count.mockResolvedValue(0);
      prisma.blogPost.create.mockImplementation(({ data }: any) => ({
        id: 'p1',
        ...data,
      }));

      const result: any = await service.create({
        title: 'Post with unsafe markup',
        excerpt:
          'Testing that server-side sanitization removes dangerous nodes.',
        content:
          '<p>Safe paragraph</p><script>alert(1)</script><img src=x onerror=alert(2)>',
        authorName: 'Editor',
      });

      expect(result.content).not.toContain('<script>');
      expect(result.content).not.toContain('onerror');
      expect(result.content).toContain('<p>Safe paragraph</p>');
    });

    it('rejects an unknown categoryId with BLOG_CATEGORY_NOT_FOUND', async () => {
      prisma.blogCategory.count.mockResolvedValue(0);

      await expect(
        service.create({
          title: 'Post with a bad category',
          excerpt:
            'The referenced blog category id does not exist in the table.',
          content:
            '<p>Body long enough to pass the minimum length validator.</p>',
          authorName: 'Editor',
          categoryId: '00000000-0000-0000-0000-000000000000',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.blogPost.create).not.toHaveBeenCalled();
    });
  });
});

describe('BlogCategoryService', () => {
  let service: BlogCategoryService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogCategoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BlogCategoryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('refuses to delete a category that still has posts attached', async () => {
    prisma.blogCategory.findUnique.mockResolvedValue({
      id: 'c1',
      _count: { posts: 3 },
    });

    await expect(service.remove('c1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.blogCategory.delete).not.toHaveBeenCalled();
  });

  it('deletes a category with no posts', async () => {
    prisma.blogCategory.findUnique.mockResolvedValue({
      id: 'c1',
      _count: { posts: 0 },
    });
    prisma.blogCategory.delete.mockResolvedValue({ id: 'c1' });

    await expect(service.remove('c1')).resolves.toEqual({
      message: 'Blog category deleted successfully',
    });
    expect(prisma.blogCategory.delete).toHaveBeenCalledWith({
      where: { id: 'c1' },
    });
  });

  it('throws NotFoundException when the category does not exist', async () => {
    prisma.blogCategory.findUnique.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
