import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/users/users.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let authService: { [K in keyof AuthService]?: jest.Mock };

  beforeAll(async () => {
    authService = {
      signIn: jest.fn(),
      signUp: jest.fn(),
      sendPhone: jest.fn(),
      verifyCode: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('returns 200 and an access token for valid credentials', async () => {
      authService.signIn!.mockResolvedValue({ access_token: 'token-123' });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '09121234567', password: 'secret' })
        .expect(200)
        .expect({ access_token: 'token-123' });

      expect(authService.signIn).toHaveBeenCalledWith(
        '09121234567',
        'secret',
      );
    });

    it('returns 400 when phone is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'secret' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('phone')]),
      );
      expect(authService.signIn).not.toHaveBeenCalled();
    });

    it('returns 400 when the phone number format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: 'not-a-phone', password: 'secret' })
        .expect(400);

      expect(authService.signIn).not.toHaveBeenCalled();
    });

    it('returns 400 when password has the wrong type', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '09121234567', password: 12345 })
        .expect(400);

      expect(authService.signIn).not.toHaveBeenCalled();
    });

    it('returns 400 for unknown extra fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '09121234567', password: 'secret', extra: 'field' })
        .expect(400);

      expect(authService.signIn).not.toHaveBeenCalled();
    });

    it('returns 401 when AuthService rejects the credentials', async () => {
      authService.signIn!.mockRejectedValue(new UnauthorizedException());

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '09121234567', password: 'wrong' })
        .expect(401);
    });
  });

  describe('POST /auth/sign-up', () => {
    it('returns 200 and an access token for a valid payload', async () => {
      authService.signUp!.mockResolvedValue({ access_token: 'token-456' });

      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({ name: 'John', phone: '09121234567', password: 'secret' })
        .expect(200)
        .expect({ access_token: 'token-456' });
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send({ phone: '09121234567', password: 'secret' })
        .expect(400);

      expect(authService.signUp).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/send-phone', () => {
    it('returns 200 for a valid phone number', async () => {
      authService.sendPhone!.mockResolvedValue({ message: 'sent' });

      await request(app.getHttpServer())
        .post('/auth/send-phone')
        .send({ phone: '09121234567' })
        .expect(200)
        .expect({ message: 'sent' });
    });

    it('returns 400 for an invalid phone number', async () => {
      await request(app.getHttpServer())
        .post('/auth/send-phone')
        .send({ phone: '123' })
        .expect(400);

      expect(authService.sendPhone).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/verify-code', () => {
    it('returns 200 and an access token for a valid code', async () => {
      authService.verifyCode!.mockResolvedValue({ access_token: 'token-789' });

      await request(app.getHttpServer())
        .post('/auth/verify-code')
        .send({ phone: '09121234567', code: '123456' })
        .expect(200)
        .expect({ access_token: 'token-789' });
    });

    it('returns 400 when code is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-code')
        .send({ phone: '09121234567' })
        .expect(400);

      expect(authService.verifyCode).not.toHaveBeenCalled();
    });

    it('returns 401 when the code is invalid or expired', async () => {
      authService.verifyCode!.mockRejectedValue(
        new UnauthorizedException('INVALID_OR_EXPIRED_CODE'),
      );

      await request(app.getHttpServer())
        .post('/auth/verify-code')
        .send({ phone: '09121234567', code: '000000' })
        .expect(401);
    });
  });
});
