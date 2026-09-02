/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
/**
 * داده‌ی نمونه‌ی فارسی برای تمام جدول‌ها.
 * اجرا:  npm run seed:fake
 * نقش‌ها و ادمین اولیه از `seed.ts` می‌آیند؛ این اسکریپت آن‌ها را دست نمی‌زند.
 * قابل اجرای چندباره است: هر بار داده‌های نمونه‌ی قبلی پاک و از نو ساخته می‌شوند.
 */
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { PrismaClient, BusinessStatus, SocialPlatform } from '@prisma/client';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

/* ---------- ابزارهای تصادفیِ قابل‌تکرار (seed ثابت) ---------- */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1373);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const pickSome = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
};
const int = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
const clampNow = (d: Date) => (d.getTime() > Date.now() ? new Date() : d);
const img = (seed: string, i: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-${i}/800/600`;

/* مختصات تقریبی زرند، استان کرمان */
const ZARAND = { lat: 30.8126, lng: 56.5644 };
const geo = () => ({
  lat: (ZARAND.lat + (rand() - 0.5) * 0.08).toFixed(7),
  lng: (ZARAND.lng + (rand() - 0.5) * 0.08).toFixed(7),
});

/* ---------- متن‌های فارسی ---------- */
const REVIEW_POS = [
  'کیفیت عالی بود، حتماً دوباره مراجعه می‌کنم.',
  'برخورد پرسنل خیلی خوب و محترمانه بود.',
  'قیمت‌ها منصفانه است و کارشان تمیز.',
  'سریع و باکیفیت، از خرید راضی بودم.',
  'محیط تمیز و مرتب، پیشنهاد می‌کنم.',
  'یکی از بهترین‌های زرند در این زمینه.',
];
const REVIEW_MIXED = [
  'بد نبود ولی انتظار بیشتری داشتم.',
  'کیفیت خوب بود اما معطل شدیم تا نوبتمان شد.',
  'قیمت نسبت به کیفیت کمی بالاست.',
  'کارشان درست بود ولی پاسخگویی تلفنی ضعیفه.',
  'اولش راضی نبودم اما بعد از پیگیری درست شد.',
];
const REVIEW_NEG = [
  'اصلاً راضی نبودم، سفارش با تأخیر زیاد آماده شد.',
  'برخورد مناسبی نداشتند، دیگر مراجعه نمی‌کنم.',
  'کیفیت پایین‌تر از چیزی بود که تبلیغ می‌کنند.',
];
const OWNER_REPLIES = [
  'از اینکه وقت گذاشتید و نظرتان را ثبت کردید سپاسگزاریم. 🙏',
  'خوشحالیم که رضایت داشتید؛ منتظر دیدار دوباره شما هستیم.',
  'بابت تجربه‌ی نامطلوبتان عذرخواهی می‌کنیم؛ لطفاً برای پیگیری با ما تماس بگیرید.',
  'نظر شما را جدی گرفتیم و در حال بهبود این بخش هستیم.',
  'ممنون از بازخورد صادقانه‌تان، حتماً رسیدگی می‌کنیم.',
];
const USER_REPLIES = [
  'منم دقیقاً همین تجربه رو داشتم.',
  'موافقم، برخوردشون واقعاً خوبه.',
  'به نظر من قیمتشون منطقیه.',
  'ممنون که نوشتی، کمکم کرد تصمیم بگیرم.',
  'من نتیجه‌ی متفاوتی داشتم ولی در کل بد نبود.',
];
const PRODUCT_REVIEW_TITLES = [
  'کاملاً راضی',
  'ارزش خرید دارد',
  'متوسط بود',
  'کیفیت خوب',
  'دوباره می‌خرم',
];

async function wipe() {
  // به ترتیب وابستگی کلیدهای خارجی
  await prisma.auditLog.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.businessReview.deleteMany({
    where: { parentId: { not: null } },
  });
  await prisma.businessReview.deleteMany();
  await prisma.favoriteBusiness.deleteMany();
  await prisma.businessImage.deleteMany();
  await prisma.businessSocialLink.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany();
  await prisma.otp.deleteMany();
  // همه‌ی کاربران جز ادمینِ seed اصلی پاک می‌شوند
  await prisma.user.deleteMany({
    where: { phone: { not: '09302207762' } },
  });
  console.log('🧹 داده‌های نمونه‌ی قبلی پاک شد');
}

/** نقش‌ها و ادمین اولیه را تضمین می‌کند (هم‌ارز seed.ts) تا اسکریپت مستقل باشد. */
async function ensureBaseline() {
  for (const role of [
    { name: 'ADMIN', description: 'System administrator' },
    { name: 'OWNER', description: 'Business owner' },
  ]) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'ADMIN' },
  });
  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'OWNER' },
  });
  await prisma.user.upsert({
    where: { phone: '09302207762' },
    update: {},
    create: {
      email: 'iman.kh7798@gmail.com',
      passwordHash: await bcrypt.hash('iman123', 10),
      phone: '09302207762',
      name: 'iman khosravi',
      roleId: adminRole.id,
    },
  });
  return { adminRoleId: adminRole.id, ownerRoleId: ownerRole.id };
}

async function main() {
  const { adminRoleId, ownerRoleId } = await ensureBaseline();
  await wipe();

  const OWNER_ROLE = ownerRoleId;

  /* ---------- کاربران ---------- */
  const passwordHash = await bcrypt.hash('test1234', 10);
  const people = [
    ['مریم رضایی', '09131234501', 'maryam.rezaei@example.com'],
    ['علی محمدی', '09131234502', 'ali.mohammadi@example.com'],
    ['زهرا حسینی', '09131234503', null],
    ['محمد کریمی', '09131234504', 'm.karimi@example.com'],
    ['فاطمه احمدی', '09131234505', null],
    ['حسین موسوی', '09131234506', 'h.mousavi@example.com'],
    ['نرگس اکبری', '09131234507', null],
    ['رضا صادقی', '09131234508', 'reza.sadeghi@example.com'],
    ['سمیرا قاسمی', '09131234509', null],
    ['امیر نجفی', '09131234510', 'amir.najafi@example.com'],
    ['لیلا شریفی', '09131234511', null],
    ['بابک تهرانی', '09131234512', 'babak.t@example.com'],
    ['مهسا کاظمی', '09131234513', null],
    ['کیوان رستمی', '09131234514', 'keyvan.rostami@example.com'],
  ] as const;

  const users: { id: string }[] = [];
  for (const [name, phone, email] of people) {
    const u = await prisma.user.create({
      data: {
        name,
        phone,
        email: email ?? undefined,
        passwordHash,
        roleId: OWNER_ROLE,
        isActive: chance(0.92),
        createdAt: daysAgo(int(30, 400)),
        metadata: { city: 'زرند', source: 'seed-fake' },
      },
      select: { id: true },
    });
    users.push(u);
  }
  console.log(`👤 ${users.length} کاربر ساخته شد`);

  // ده نفر اول صاحب کسب‌وکار، بقیه فقط مشتری
  const owners = users.slice(0, 10);
  const customers = users; // همه می‌توانند نظر بدهند / علاقه‌مندی ثبت کنند

  /* ---------- دسته‌بندی‌ها (درختی) ---------- */
  const catTree: Record<
    string,
    { name: string; children: [string, string][] }
  > = {
    food: {
      name: 'خوراک و رستوران',
      children: [
        ['food-restaurant', 'رستوران سنتی'],
        ['food-fastfood', 'فست‌فود'],
        ['food-cafe', 'کافه'],
        ['food-pastry', 'قنادی و شیرینی'],
      ],
    },
    shopping: {
      name: 'خرید و پوشاک',
      children: [
        ['shopping-men', 'پوشاک مردانه'],
        ['shopping-women', 'پوشاک زنانه'],
        ['shopping-bags-shoes', 'کیف و کفش'],
      ],
    },
    services: {
      name: 'خدمات',
      children: [
        ['services-auto', 'تعمیرات خودرو'],
        ['services-plumbing', 'لوله‌کشی و تأسیسات'],
        ['services-cleaning', 'نظافت منزل'],
      ],
    },
    beauty: {
      name: 'زیبایی و سلامت',
      children: [
        ['beauty-barber', 'آرایشگاه مردانه'],
        ['beauty-salon', 'سالن زیبایی زنانه'],
        ['beauty-pharmacy', 'داروخانه'],
      ],
    },
    grocery: {
      name: 'سوپرمارکت و مواد غذایی',
      children: [
        ['grocery-market', 'سوپرمارکت'],
        ['grocery-fruit', 'میوه و تره‌بار'],
        ['grocery-bakery', 'نانوایی'],
      ],
    },
  };

  const leafBySlug: Record<string, { id: string; slug: string; name: string }> =
    {};
  for (const [rootSlug, node] of Object.entries(catTree)) {
    const parent = await prisma.category.create({
      data: {
        name: node.name,
        slug: rootSlug,
        description: `دسته‌بندی ${node.name}`,
        coverImageUrl: img(rootSlug, 0),
        isActive: true,
      },
      select: { id: true },
    });
    for (const [slug, name] of node.children) {
      const child = await prisma.category.create({
        data: {
          name,
          slug,
          description: `${name} در زرند`,
          parentId: parent.id,
          coverImageUrl: img(slug, 0),
          isActive: chance(0.95),
        },
        select: { id: true, slug: true, name: true },
      });
      leafBySlug[slug] = child;
    }
  }
  const leaves = Object.values(leafBySlug);
  console.log(
    `🗂️  ${Object.keys(catTree).length} دسته‌ی والد و ${leaves.length} زیردسته ساخته شد`,
  );

  /* ---------- کسب‌وکارها ---------- */
  const bizSpec: [string, string, BusinessStatus][] = [
    ['رستوران سنتی زرند', 'food-restaurant', BusinessStatus.APPROVED],
    ['فست‌فود ستاره', 'food-fastfood', BusinessStatus.APPROVED],
    ['کافه آرامش', 'food-cafe', BusinessStatus.APPROVED],
    ['قهوه‌خانه چهل‌ستون', 'food-cafe', BusinessStatus.APPROVED],
    ['شیرینی‌سرای گل', 'food-pastry', BusinessStatus.APPROVED],
    ['کبابی دنده', 'food-restaurant', BusinessStatus.REJECTED],
    ['پوشاک مردانه اطلس', 'shopping-men', BusinessStatus.APPROVED],
    ['بوتیک بانو', 'shopping-women', BusinessStatus.PENDING],
    ['کفش و کیف پارسیان', 'shopping-bags-shoes', BusinessStatus.APPROVED],
    [
      'تعمیرگاه مکانیکی برادران احمدی',
      'services-auto',
      BusinessStatus.APPROVED,
    ],
    ['تأسیسات مهر', 'services-plumbing', BusinessStatus.APPROVED],
    ['خدمات نظافتی تمیز', 'services-cleaning', BusinessStatus.PENDING],
    ['آرایشگاه مردانه شیک', 'beauty-barber', BusinessStatus.APPROVED],
    ['سالن زیبایی رز', 'beauty-salon', BusinessStatus.APPROVED],
    ['داروخانه دکتر رضوی', 'beauty-pharmacy', BusinessStatus.APPROVED],
    ['سوپرمارکت مرکزی', 'grocery-market', BusinessStatus.APPROVED],
    ['میوه‌فروشی برکت', 'grocery-fruit', BusinessStatus.REJECTED],
    ['نانوایی بربری تازه', 'grocery-bakery', BusinessStatus.PENDING],
  ];
  const streets = [
    'خیابان امام خمینی',
    'بلوار جمهوری اسلامی',
    'خیابان شهید مطهری',
    'خیابان طالقانی',
    'بلوار معلم',
    'خیابان ۱۷ شهریور',
  ];

  type Biz = {
    id: string;
    ownerId: string;
    title: string;
    slug: string;
    status: BusinessStatus;
  };
  const businesses: Biz[] = [];
  for (let i = 0; i < bizSpec.length; i++) {
    const [title, slug, status] = bizSpec[i];
    const owner = owners[i % owners.length];
    const { lat, lng } = geo();
    const b = await prisma.business.create({
      data: {
        title,
        description: `${title}؛ ارائه‌ی خدمات با کیفیت در شهر زرند.`,
        address: `کرمان، زرند، ${pick(streets)}، پلاک ${int(1, 240)}`,
        phone: `0343342${int(1000, 9999)}`,
        isActive: status === BusinessStatus.APPROVED,
        status,
        ownerId: owner.id,
        categoryId: leafBySlug[slug].id,
        lat,
        lng,
        createdAt: daysAgo(int(10, 300)),
      },
      select: { id: true, ownerId: true, title: true },
    });
    businesses.push({ ...b, slug, status });
  }
  console.log(`🏬 ${businesses.length} کسب‌وکار ساخته شد`);

  /* ---------- تصاویر کسب‌وکار ---------- */
  const bizImages = businesses.flatMap((b) =>
    Array.from({ length: int(2, 4) }, (_, k) => ({
      businessId: b.id,
      url: img(b.slug + b.id.slice(0, 4), k),
      altText: `تصویر ${k + 1} از ${b.title}`,
      position: k,
    })),
  );
  await prisma.businessImage.createMany({ data: bizImages });

  /* ---------- شبکه‌های اجتماعی کسب‌وکار ---------- */
  const platforms = [
    SocialPlatform.INSTAGRAM,
    SocialPlatform.TELEGRAM,
    SocialPlatform.WHATSAPP,
    SocialPlatform.WEBSITE,
    SocialPlatform.EITAA,
  ];
  const hostFor: Partial<Record<SocialPlatform, string>> = {
    INSTAGRAM: 'https://instagram.com/',
    TELEGRAM: 'https://t.me/',
    WHATSAPP: 'https://wa.me/98913',
    WEBSITE: 'https://',
    EITAA: 'https://eitaa.com/',
  };
  const socialRows = businesses.flatMap((b, i) => {
    const chosen = pickSome(platforms, int(2, 3));
    return chosen.map((p) => ({
      businessId: b.id,
      platform: p,
      url:
        p === SocialPlatform.WHATSAPP
          ? `${hostFor[p]}${int(1000000, 9999999)}`
          : p === SocialPlatform.WEBSITE
            ? `${hostFor[p]}${b.slug}-${i}.ir`
            : `${hostFor[p]}${b.slug.replace(/-/g, '_')}_${i}`,
    }));
  });
  await prisma.businessSocialLink.createMany({ data: socialRows });
  console.log(
    `🖼️  ${bizImages.length} تصویر و ${socialRows.length} لینک اجتماعی ثبت شد`,
  );

  /* ---------- نظرهای کسب‌وکار + پاسخ‌ها (یک سطح) ---------- */
  const approvedBiz = businesses.filter(
    (b) => b.status === BusinessStatus.APPROVED,
  );
  const roots: {
    id: string;
    businessId: string;
    ownerId: string;
    userId: string;
    createdAt: Date;
  }[] = [];
  for (const b of approvedBiz) {
    const reviewers = pickSome(
      customers.filter((u) => u.id !== b.ownerId),
      int(3, 6),
    );
    for (const u of reviewers) {
      const bucket = chance(0.6)
        ? REVIEW_POS
        : chance(0.6)
          ? REVIEW_MIXED
          : REVIEW_NEG;
      const isApproved = chance(0.8);
      const createdAt = daysAgo(int(3, 120));
      const r = await prisma.businessReview.create({
        data: {
          businessId: b.id,
          userId: u.id,
          rating:
            bucket === REVIEW_POS
              ? int(4, 5)
              : bucket === REVIEW_MIXED
                ? int(3, 4)
                : int(1, 2),
          body: pick(bucket),
          isApproved,
          approvedAt: isApproved
            ? clampNow(new Date(createdAt.getTime() + 86400000))
            : null,
          createdAt,
        },
        select: { id: true },
      });
      roots.push({
        id: r.id,
        businessId: b.id,
        ownerId: b.ownerId,
        userId: u.id,
        createdAt,
      });
    }
  }

  const replies: any[] = [];
  for (const root of roots) {
    // پاسخ صاحب کسب‌وکار
    if (chance(0.55)) {
      const createdAt = clampNow(
        new Date(root.createdAt.getTime() + int(1, 6) * 86400000),
      );
      replies.push({
        businessId: root.businessId,
        userId: root.ownerId,
        parentId: root.id,
        rating: null,
        body: pick(OWNER_REPLIES),
        isApproved: true,
        approvedAt: createdAt,
        createdAt,
      });
    }
    // پاسخ یک کاربر دیگر
    if (chance(0.3)) {
      const other = pick(
        customers.filter((u) => u.id !== root.ownerId && u.id !== root.userId),
      );
      const createdAt = clampNow(
        new Date(root.createdAt.getTime() + int(2, 15) * 86400000),
      );
      const isApproved = chance(0.85);
      replies.push({
        businessId: root.businessId,
        userId: other.id,
        parentId: root.id,
        rating: null,
        body: pick(USER_REPLIES),
        isApproved,
        approvedAt: isApproved ? createdAt : null,
        createdAt,
      });
    }
  }
  if (replies.length) await prisma.businessReview.createMany({ data: replies });
  console.log(`⭐ ${roots.length} نظر ریشه و ${replies.length} پاسخ ثبت شد`);

  /* ---------- علاقه‌مندی‌ها ---------- */
  const favSet = new Set<string>();
  const favRows: { userId: string; businessId: string }[] = [];
  while (favRows.length < 30) {
    const u = pick(customers);
    const b = pick(businesses);
    const key = `${u.id}:${b.id}`;
    if (favSet.has(key)) continue;
    favSet.add(key);
    favRows.push({ userId: u.id, businessId: b.id });
  }
  await prisma.favoriteBusiness.createMany({ data: favRows });
  console.log(`❤️  ${favRows.length} علاقه‌مندی ثبت شد`);

  /* ---------- محصولات (ماژول غیرفعال است ولی جدول‌ها پر می‌شوند) ---------- */
  const productCatalog: Record<string, string[]> = {
    'shopping-men': [
      'پیراهن مردانه',
      'شلوار جین',
      'کاپشن زمستانه',
      'تیشرت نخی',
    ],
    'shopping-women': ['مانتو مجلسی', 'شال نخی', 'بلوز آستین‌بلند'],
    'shopping-bags-shoes': ['کفش چرم مردانه', 'کیف دستی زنانه', 'کتانی ورزشی'],
    'grocery-market': [
      'روغن آفتابگردان ۱.۸ لیتری',
      'برنج ایرانی ۱۰ کیلویی',
      'چای کیسه‌ای',
    ],
    'beauty-pharmacy': ['کرم مرطوب‌کننده', 'شامپو ضدشوره', 'ویتامین D قطره‌ای'],
    'food-pastry': [
      'شیرینی دانمارکی (کیلویی)',
      'کیک خامه‌ای',
      'باقلوا (جعبه‌ای)',
    ],
  };
  type Prod = { id: string; businessId: string; price: number; slug: string };
  const products: Prod[] = [];
  for (const b of businesses) {
    const names = productCatalog[b.slug];
    if (!names) continue;
    for (const name of pickSome(names, int(2, names.length))) {
      const price = int(45, 900) * 1000;
      const hasCompare = chance(0.4);
      const p = await prisma.product.create({
        data: {
          title: name,
          description: `${name} با کیفیت مطلوب، عرضه‌شده توسط ${b.title}.`,
          shortDescription: name,
          price: price.toFixed(2),
          compareAtPrice: hasCompare
            ? (price + int(10, 120) * 1000).toFixed(2)
            : null,
          sku: `SKU-${b.slug.toUpperCase().replace(/-/g, '')}-${int(100, 999)}`,
          stockQuantity: int(0, 150),
          manageStock: true,
          isActive: chance(0.9),
          businessId: b.id,
          metadata: { origin: 'ایران' },
          createdAt: daysAgo(int(5, 200)),
        },
        select: { id: true },
      });
      products.push({ id: p.id, businessId: b.id, price, slug: b.slug });
    }
  }

  const prodImages = products.flatMap((p, idx) =>
    Array.from({ length: 2 }, (_, k) => ({
      productId: p.id,
      url: img('product' + idx, k),
      altText: `تصویر محصول ${idx + 1}`,
      position: k,
    })),
  );
  await prisma.productImage.createMany({ data: prodImages });

  const SIZES = ['S', 'M', 'L', 'XL', '۳۸', '۴۰', '۴۲', '۴۴'];
  const COLORS = ['مشکی', 'سفید', 'سرمه‌ای', 'طوسی', 'قهوه‌ای'];
  const variantRows: any[] = [];
  let variantSku = 1000;
  for (const p of products) {
    if (
      !['shopping-men', 'shopping-women', 'shopping-bags-shoes'].includes(
        p.slug,
      )
    )
      continue;
    for (const size of pickSome(SIZES, int(2, 3))) {
      const color = pick(COLORS);
      variantRows.push({
        productId: p.id,
        sku: `VAR-${variantSku++}`,
        title: `${color} / ${size}`,
        priceOverride: chance(0.3)
          ? (p.price + int(5, 40) * 1000).toFixed(2)
          : null,
        stockQuantity: int(0, 40),
      });
    }
  }
  if (variantRows.length)
    await prisma.productVariant.createMany({ data: variantRows });
  console.log(
    `📦 ${products.length} محصول، ${prodImages.length} تصویر و ${variantRows.length} واریانت ساخته شد`,
  );

  /* ---------- نظرهای محصول ---------- */
  const prodReviewSet = new Set<string>();
  const prodReviews: any[] = [];
  for (const p of products) {
    for (const u of pickSome(customers, int(0, 3))) {
      const key = `${p.id}:${u.id}`;
      if (prodReviewSet.has(key)) continue;
      prodReviewSet.add(key);
      prodReviews.push({
        productId: p.id,
        userId: u.id,
        rating: int(2, 5),
        title: pick(PRODUCT_REVIEW_TITLES),
        body: pick([...REVIEW_POS, ...REVIEW_MIXED]),
        isApproved: chance(0.75),
        createdAt: daysAgo(int(1, 90)),
      });
    }
  }
  if (prodReviews.length) await prisma.review.createMany({ data: prodReviews });
  console.log(`📝 ${prodReviews.length} نظر محصول ثبت شد`);

  /* ---------- سفارش‌ها + آیتم‌ها ---------- */
  const withProducts = businesses.filter((b) =>
    products.some((p) => p.businessId === b.id),
  );
  let orderCount = 0;
  let itemCount = 0;
  for (let i = 0; i < 6; i++) {
    const b = pick(withProducts);
    const buyer = pick(customers.filter((u) => u.id !== b.ownerId));
    const bizProducts = products.filter((p) => p.businessId === b.id);
    const lineProducts = pickSome(
      bizProducts,
      int(1, Math.min(3, bizProducts.length)),
    );
    const lines = lineProducts.map((p) => {
      const qty = int(1, 4);
      return {
        productId: p.id,
        quantity: qty,
        unitPrice: p.price.toFixed(2),
        totalPrice: (p.price * qty).toFixed(2),
      };
    });
    const subtotal = lines.reduce((s, l) => s + Number(l.totalPrice), 0);
    const shipping = pick([0, 25000, 45000]);
    const status = pick([
      'pending',
      'paid',
      'shipped',
      'delivered',
      'canceled',
    ]);
    const createdAt = daysAgo(int(1, 60));
    await prisma.order.create({
      data: {
        status,
        subtotal: subtotal.toFixed(2),
        shippingAmount: shipping.toFixed(2),
        taxAmount: '0.00',
        totalAmount: (subtotal + shipping).toFixed(2),
        currency: 'IRR',
        paymentMethod: pick(['online', 'cod', 'card-to-card']),
        paymentStatus: status === 'pending' ? 'unpaid' : 'paid',
        shippingAddress: `کرمان، زرند، ${pick(streets)}، پلاک ${int(1, 240)}`,
        userId: buyer.id,
        businessId: b.id,
        createdAt,
        items: { create: lines },
      },
    });
    orderCount++;
    itemCount += lines.length;
  }
  console.log(`🧾 ${orderCount} سفارش با ${itemCount} آیتم ساخته شد`);

  /* ---------- رزرو موجودی ---------- */
  const reservationRows = pickSome(products, Math.min(4, products.length)).map(
    (p) => ({
      productId: p.id,
      userId: pick(customers).id,
      quantity: int(1, 3),
      status: pick(['active', 'released', 'expired']),
      expiresAt: new Date(Date.now() + int(-2, 5) * 86400000),
    }),
  );
  if (reservationRows.length)
    await prisma.stockReservation.createMany({ data: reservationRows });
  console.log(`🔒 ${reservationRows.length} رزرو موجودی ثبت شد`);

  /* ---------- لاگ تغییرات ---------- */
  const admin = await prisma.user.findFirst({ where: { roleId: adminRoleId } });
  const auditRows = businesses.slice(0, 8).map((b) => ({
    entityType: 'Business',
    entityId: b.id,
    action:
      b.status === BusinessStatus.APPROVED
        ? 'STATUS_APPROVED'
        : b.status === BusinessStatus.REJECTED
          ? 'STATUS_REJECTED'
          : 'CREATED',
    diff: { status: b.status },
    performedById: admin?.id ?? null,
    createdAt: daysAgo(int(1, 90)),
  }));
  await prisma.auditLog.createMany({ data: auditRows });
  console.log(`🗒️  ${auditRows.length} لاگ ثبت شد`);

  /* ---------- OTP ---------- */
  await prisma.otp.createMany({
    data: [
      {
        phone: '09131234511',
        code: '482913',
        expiresAt: new Date(Date.now() + 120000),
      },
      {
        phone: '09131234512',
        code: '119274',
        expiresAt: new Date(Date.now() - 300000),
      },
      {
        phone: '09131234513',
        code: '650331',
        expiresAt: new Date(Date.now() - 86400000),
      },
    ],
  });
  console.log('📱 ۳ رکورد OTP ثبت شد');

  console.log('\n✅ داده‌ی نمونه با موفقیت ساخته شد');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
