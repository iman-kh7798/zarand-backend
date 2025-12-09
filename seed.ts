// prisma/seed.ts
import 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';
import * as bcrypt from 'bcrypt';
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
