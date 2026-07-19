import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function rolesSeed() {
  // نقش‌ها رو طوری upsert می‌کنیم که اگر وجود داشت، دوباره ساخته نشه
  const roles = [
    { name: 'ADMIN', description: 'System administrator' },
    { name: 'OWNER', description: 'Business owner' },
    { name: 'USER', description: 'Customer / buyer' },
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

async function usersSeed() {
  const passwordHash = await bcrypt.hash('iman123', 10);
  await prisma.user.upsert({
    where: { phone: '09302207762' },
    update: {},
    create: {
      email: 'iman.kh7798@gmail.com',
      passwordHash,
      phone: '09302207762',
      name: 'iman khosravi',
      role: { connect: { id: 1 } },
    },
  });

  console.log('Admin seeded successfully ✅');
}

async function main() {
  await rolesSeed();
  await usersSeed();
  console.log('All seeded successfully ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
