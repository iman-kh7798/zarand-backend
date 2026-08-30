import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, isAbsolute, join, relative, resolve } from 'path';

/** نام پوشه‌ی ریشه‌ی آپلود روی دیسک و پیشوند مسیر عمومی */
export const UPLOAD_ROOT = 'uploads';

/** زیرشاخه‌ی پایه‌ی تصاویر کسب‌وکار: uploads/businesses/YYYY/MM/DD */
export const BUSINESS_SCOPE = 'businesses';

export interface UploadResult {
  filename: string;
  /** مسیر نسبی قابل ذخیره در دیتابیس، مثل `/uploads/businesses/2026/08/27/173...-a.jpg` */
  path: string;
}

export interface UploadOptions {
  /**
   * زیرشاخه‌ی پایه (مثل `businesses`). اگر ندهی، فایل مثل قبل
   * مستقیم داخل `uploads/` نوشته می‌شود (سازگاری با کد قدیمی).
   */
  scope?: string;
  /**
   * تاریخ مبنای پوشه‌بندی `YYYY/MM/DD` — معمولاً `createdAt` کسب‌وکار.
   * فقط وقتی `scope` داده شده باشد اثر دارد؛ پیش‌فرض: همین حالا.
   */
  date?: Date;
}

@Injectable()
export class UploadService {
  constructor() {}

  create(file: Express.Multer.File, options?: UploadOptions): UploadResult {
    const relativeDir = UploadService.buildRelativeDir(options);
    const absoluteDir = join(process.cwd(), UPLOAD_ROOT, relativeDir);

    // پوشه‌ی مقصد به‌صورت بازگشتی ساخته می‌شود
    if (!existsSync(absoluteDir)) {
      mkdirSync(absoluteDir, { recursive: true });
    }

    const filename = `${Date.now()}-${UploadService.safeFilename(file.originalname)}`;
    writeFileSync(join(absoluteDir, filename), file.buffer);

    return {
      filename,
      path: UploadService.toPublicPath(relativeDir, filename),
    };
  }

  createMany(
    files: Express.Multer.File[],
    options?: UploadOptions,
  ): UploadResult[] {
    return files.map((file) => this.create(file, options));
  }

  remove(filePath?: string | null) {
    const absolutePath = UploadService.toAbsolutePath(filePath);
    if (absolutePath && existsSync(absolutePath)) unlinkSync(absolutePath);
  }

  removeMany(filePaths: (string | null | undefined)[]) {
    filePaths.forEach((filePath) => this.remove(filePath));
  }

  /**
   * ساخت مسیر نسبی پوشه بر اساس scope و تاریخ.
   * بدون scope رشته‌ی خالی برمی‌گرداند (یعنی ریشه‌ی uploads).
   */
  static buildRelativeDir(options?: UploadOptions): string {
    if (!options?.scope) return '';

    const date = options.date ?? new Date();
    const safeDate = isNaN(date.getTime()) ? new Date() : date;

    const year = String(safeDate.getFullYear());
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');

    return `${options.scope}/${year}/${month}/${day}`;
  }

  /** مسیر عمومی/دیتابیسی: `/uploads/<dir>/<filename>` */
  static toPublicPath(relativeDir: string, filename: string): string {
    return relativeDir
      ? `/${UPLOAD_ROOT}/${relativeDir}/${filename}`
      : `/${UPLOAD_ROOT}/${filename}`;
  }

  /**
   * تبدیل مسیر ذخیره‌شده در دیتابیس به مسیر مطلق روی دیسک.
   * هم مسیرهای قدیمی (`/uploads/x.jpg` یا فقط `x.jpg`) و هم تودرتوها را می‌پذیرد
   * و در صورت خروج از ریشه‌ی uploads (path traversal) `null` برمی‌گرداند.
   */
  static toAbsolutePath(filePath?: string | null): string | null {
    if (!filePath) return null;

    const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const withoutRoot = normalized.startsWith(`${UPLOAD_ROOT}/`)
      ? normalized.slice(UPLOAD_ROOT.length + 1)
      : normalized;
    if (!withoutRoot) return null;

    const root = join(process.cwd(), UPLOAD_ROOT);
    const absolutePath = resolve(root, withoutRoot);

    const rel = relative(root, absolutePath);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;

    return absolutePath;
  }

  /** حذف مسیر از نام فایل تا آپلود نتواند بیرون از پوشه‌ی مقصد بنویسد */
  private static safeFilename(originalname: string): string {
    return (
      basename(originalname ?? '')
        .replace(/[\\/]/g, '_')
        .replace(/^\.+/, '') || 'file'
    );
  }
}
