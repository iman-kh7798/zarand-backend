// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // نقش‌ها رو طوری upsert می‌کنیم که اگر وجود داشت، دوباره ساخته نشه
  const roles = [
    { name: 'admin', description: 'System administrator' },
    { name: 'business_owner', description: 'Business owner' },
    { name: 'customer', description: 'Customer / buyer' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {}, // اگر هست کاری نکن
      create: {
        name: role.name,
        description: role.description,
      },
    });
  }

  console.log('Roles seeded successfully ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
