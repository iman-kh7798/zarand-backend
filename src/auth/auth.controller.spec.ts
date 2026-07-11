import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from 'src/users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { [K in keyof AuthService]?: jest.Mock };

  beforeEach(async () => {
    authService = {
      signIn: jest.fn(),
      signUp: jest.fn(),
      sendPhone: jest.fn(),
      verifyCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('delegates to AuthService.signIn with phone and password', async () => {
      authService.signIn!.mockResolvedValue({ access_token: 'token' });

      const result = await controller.signIn({
        phone: '09121234567',
        password: 'secret',
      });

      expect(authService.signIn).toHaveBeenCalledWith(
        '09121234567',
        'secret',
      );
      expect(result).toEqual({ access_token: 'token' });
    });
  });

  describe('signUp', () => {
    it('delegates to AuthService.signUp with name, phone and password', async () => {
      authService.signUp!.mockResolvedValue({ access_token: 'token' });

      const result = await controller.signUp({
        name: 'John',
        phone: '09121234567',
        password: 'secret',
      });

      expect(authService.signUp).toHaveBeenCalledWith(
        'John',
        '09121234567',
        'secret',
      );
      expect(result).toEqual({ access_token: 'token' });
    });
  });

  describe('sendPhone', () => {
    it('delegates to AuthService.sendPhone', async () => {
      authService.sendPhone!.mockResolvedValue({ message: 'sent' });

      const result = await controller.sendPhone({ phone: '09121234567' });

      expect(authService.sendPhone).toHaveBeenCalledWith('09121234567');
      expect(result).toEqual({ message: 'sent' });
    });
  });

  describe('verifyCode', () => {
    it('delegates to AuthService.verifyCode with phone and code', async () => {
      authService.verifyCode!.mockResolvedValue({ access_token: 'token' });

      const result = await controller.verifyCode({
        phone: '09121234567',
        code: '123456',
      });

      expect(authService.verifyCode).toHaveBeenCalledWith(
        '09121234567',
        '123456',
      );
      expect(result).toEqual({ access_token: 'token' });
    });
  });
});
