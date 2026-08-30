/**
 * مایگریشن یک‌باره‌ی تصاویر کسب‌وکار:
 * فایل‌هایی که مستقیم داخل `uploads/` هستند را به
 * `uploads/businesses/YYYY/MM/DD/` (بر اساس تاریخ ساخت کسب‌وکار) منتقل می‌کند
 * و مقدار `BusinessImage.url` را در دیتابیس به‌روز می‌کند.
 *
 * اجرا:
 *   npm run migrate:business-images -- --dry-run   # فقط گزارش، بدون تغییر
 *   npm run migrate:business-images                # اجرای واقعی
 */
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { extname, join } from 'path';
import {
  BUSINESS_SCOPE,
  UPLOAD_ROOT,
  UploadService,
} from '../src/upload/upload.service';

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOADS_DIR = join(process.cwd(), UPLOAD_ROOT);

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

const stats = {
  total: 0,
  moved: 0,
  skipped: 0,
  missing: 0,
  failed: 0,
};

/**
 * اگر نام فایل در مقصد از قبل وجود داشت، پسوند عددی اضافه می‌کند
 * تا فایل قبلی بازنویسی نشود.
 */
function uniqueFilename(absoluteDir: string, filename: string): string {
  if (!existsSync(join(absoluteDir, filename))) return filename;

  const ext = extname(filename);
  const base = filename.slice(0, filename.length - ext.length);

  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (!existsSync(join(absoluteDir, candidate))) return candidate;
  }
  // بعید است، ولی برای اطمینان
  return `${base}-${Date.now()}${ext}`;
}

/** انتقال فایل؛ اگر مبدأ و مقصد روی دو دستگاه باشند به copy+unlink برمی‌گردد */
function moveFile(from: string, to: string) {
  try {
    renameSync(from, to);
  } catch (error: any) {
    if (error?.code !== 'EXDEV') throw error;
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

async function migrate() {
  if (!existsSync(UPLOADS_DIR)) {
    console.error(`❌ پوشه‌ی آپلود پیدا نشد: ${UPLOADS_DIR}`);
    return;
  }

  const images = await prisma.businessImage.findMany({
    select: {
      id: true,
      url: true,
      createdAt: true,
      business: { select: { createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  stats.total = images.length;
  console.log(
    `🔎 ${images.length} تصویر کسب‌وکار پیدا شد${DRY_RUN ? ' (حالت dry-run)' : ''}`,
  );

  for (const image of images) {
    try {
      if (!image.url) {
        stats.skipped++;
        continue;
      }

      // قبلاً منتقل شده
      const normalized = image.url.replace(/\\/g, '/').replace(/^\/+/, '');
      if (normalized.includes(`/${BUSINESS_SCOPE}/`)) {
        stats.skipped++;
        continue;
      }

      const sourcePath = UploadService.toAbsolutePath(image.url);
      if (!sourcePath) {
        console.warn(
          `⚠️  مسیر نامعتبر، رد شد — image=${image.id} url=${image.url}`,
        );
        stats.skipped++;
        continue;
      }

      if (!existsSync(sourcePath)) {
        console.warn(
          `⚠️  فایل روی دیسک نیست، دیتابیس دست‌نخورده ماند — image=${image.id} url=${image.url}`,
        );
        stats.missing++;
        continue;
      }

      // تاریخ ساخت کسب‌وکار مبنا است؛ اگر نبود، تاریخ خود تصویر
      const date = image.business?.createdAt ?? image.createdAt ?? new Date();
      const relativeDir = UploadService.buildRelativeDir({
        scope: BUSINESS_SCOPE,
        date,
      });
      const absoluteDir = join(UPLOADS_DIR, relativeDir);

      const currentName = sourcePath.split(/[\\/]/).pop() as string;

      if (DRY_RUN) {
        console.log(
          `→ ${image.url}  ⇒  ${UploadService.toPublicPath(relativeDir, currentName)}`,
        );
        stats.moved++;
        continue;
      }

      if (!existsSync(absoluteDir)) {
        mkdirSync(absoluteDir, { recursive: true });
      }

      const filename = uniqueFilename(absoluteDir, currentName);
      const targetPath = join(absoluteDir, filename);
      const newUrl = UploadService.toPublicPath(relativeDir, filename);

      moveFile(sourcePath, targetPath);

      try {
        await prisma.businessImage.update({
          where: { id: image.id },
          data: { url: newUrl },
        });
      } catch (dbError) {
        // اگر دیتابیس آپدیت نشد، فایل را برگردان تا وضعیت ناسازگار نماند
        try {
          moveFile(targetPath, sourcePath);
        } catch {
          console.error(
            `‼️  فایل منتقل شد ولی نه دیتابیس آپدیت شد و نه بازگردانی — ${targetPath}`,
          );
        }
        throw dbError;
      }

      console.log(`✅ ${image.url}  ⇒  ${newUrl}`);
      stats.moved++;
    } catch (error: any) {
      stats.failed++;
      console.error(
        `❌ خطا در image=${image.id}: ${error?.message ?? String(error)}`,
      );
    }
  }
}

migrate()
  .catch((error) => {
    console.error('❌ مایگریشن ناتمام ماند:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    console.log('\n— خلاصه —');
    console.log(`کل: ${stats.total}`);
    console.log(`${DRY_RUN ? 'قابل انتقال' : 'منتقل‌شده'}: ${stats.moved}`);
    console.log(`رد شده (از قبل مرتب/نامعتبر): ${stats.skipped}`);
    console.log(`فایل گم‌شده روی دیسک: ${stats.missing}`);
    console.log(`خطا: ${stats.failed}`);
    void prisma.$disconnect();
  });
