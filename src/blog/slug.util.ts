import { randomUUID } from 'crypto';

/**
 * نگاشت حروف فارسی/عربی به معادل لاتین برای ساخت slug خوانا.
 * کامل نیست ولی برای عنوان‌های رایج مقاله کافی است؛ هر چیزی که اینجا نباشد
 * در مرحله‌ی بعد حذف می‌شود و اگر رشته خالی شد به suffix تصادفی می‌افتیم.
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  آ: 'a',
  ا: 'a',
  أ: 'a',
  إ: 'a',
  ئ: 'y',
  ء: '',
  ب: 'b',
  پ: 'p',
  ت: 't',
  ث: 's',
  ج: 'j',
  چ: 'ch',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  ژ: 'zh',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'z',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'gh',
  ک: 'k',
  ك: 'k',
  گ: 'g',
  ل: 'l',
  م: 'm',
  ن: 'n',
  و: 'v',
  ه: 'h',
  ة: 'h',
  ی: 'y',
  ي: 'y',
  ى: 'a',
  // ارقام فارسی و عربی
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

/**
 * ساخت slug از یک رشته: حروف فارسی translit می‌شوند، فاصله‌ها و کاراکترهای
 * غیرمجاز به `-` تبدیل می‌شوند و نتیجه lowercase و trim شده برمی‌گردد.
 * اگر رشته کاملاً غیرلاتین بود و چیزی باقی نماند، رشته‌ی خالی برمی‌گردد
 * (تصمیم درباره‌ی fallback با `generateUniqueSlug` است).
 */
export function slugify(input: string): string {
  const transliterated = Array.from(input ?? '')
    .map((ch) => {
      if (ch in TRANSLITERATION_MAP) return TRANSLITERATION_MAP[ch];
      return ch;
    })
    .join('');

  return transliterated
    .toLowerCase()
    .replace(/[‌‏‎]/g, '') // نیم‌فاصله و کاراکترهای جهت‌دهی
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * یک slug یکتا می‌سازد. اگر `base` بعد از slugify خالی شد (عنوان کاملاً غیرلاتین)
 * از یک suffix تصادفی مبتنی بر uuid استفاده می‌شود. اگر slug تکراری بود،
 * عددِ افزایشی (`-2`, `-3`, ...) به آن اضافه می‌شود تا یکتا شود.
 *
 * @param base      متن پایه (معمولاً عنوان مقاله یا slug دلخواه کاربر)
 * @param exists    تابعی که می‌گوید آیا این slug از قبل وجود دارد یا نه
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let root = slugify(base);
  if (!root) {
    root = `post-${randomUUID().slice(0, 8)}`;
  }

  if (!(await exists(root))) return root;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }

  // بعیدترین حالت — همه‌ی اعداد گرفته شده بودند
  return `${root}-${randomUUID().slice(0, 8)}`;
}
