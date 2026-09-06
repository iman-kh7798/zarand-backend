import sanitizeHtml from 'sanitize-html';

/**
 * تگ‌های قالب‌بندی مجاز در متن مقاله. هر چیز دیگری (از جمله `<script>`)
 * و همه‌ی هندلرهای inline مثل `onclick`/`onerror` حذف می‌شوند.
 * این یک لایه‌ی دفاعی است تا وقتی بعداً نقش «ویرایشگر محتوا» یا فرم عمومی
 * اضافه شد، محتوای مخرب ذخیره نشود.
 */
const ALLOWED_TAGS = [
  'p',
  'h2',
  'h3',
  'h4',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'blockquote',
  'br',
];

/** پاک‌سازی HTML سمت سرور قبل از ذخیره در دیتابیس */
export function sanitizeContent(dirty: string): string {
  return sanitizeHtml(dirty ?? '', {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    // لینک‌های خارجی امن باز شوند
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

/**
 * تخمین زمان مطالعه بر حسب دقیقه از روی طول متن.
 * تگ‌های HTML حذف و کلمات با فاصله شمرده می‌شوند؛ سرعت ۲۰۰ کلمه در دقیقه،
 * رو به بالا گرد می‌شود و حداقل ۱ دقیقه است.
 */
export function estimateReadTimeMinutes(html: string): number {
  const text = (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}
