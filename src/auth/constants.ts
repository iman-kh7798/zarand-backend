import 'dotenv/config';
import type { JwtSignOptions } from '@nestjs/jwt';

const secret = process.env.JWT_SECRET;

// بدون secret اپ نباید بالا بیاید — وگرنه ناخواسته با یک مقدار پیش‌فرض
// و قابل حدس زدن توکن امضا می‌شود.
if (!secret) {
  throw new Error(
    'JWT_SECRET is not set. Copy env.example to .env and fill JWT_SECRET.',
  );
}

export const jwtConstants = {
  secret,
  expiresIn: (process.env.JWT_EXPIRES_IN ??
    '3600s') as JwtSignOptions['expiresIn'],
};
