import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from 'src/users/users.service';
import { RoleService } from 'src/role/role.service';
import { NotificationService } from 'src/notification/notification.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { [K in keyof UserService]?: jest.Mock };
  let roleService: { [K in keyof RoleService]?: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let notificationService: { notify: jest.Mock };

  const role = { id: 2, name: 'OWNER', description: null };
  const user = {
    id: 'user-1',
    phone: '09121234567',
    roleId: 2,
    name: 'John',
  };

  beforeEach(async () => {
    userService = {
      validateUser: jest.fn(),
      create: jest.fn(),
      findByPhone: jest.fn(),
      saveVerificationCode: jest.fn(),
      findValidOtp: jest.fn(),
      expireValidOtp: jest.fn(),
    };
    roleService = {
      findOne: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };
    notificationService = {
      notify: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: RoleService, useValue: roleService },
        { provide: JwtService, useValue: jwtService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('returns an access token for valid credentials', async () => {
      userService.validateUser!.mockResolvedValue(user);
      roleService.findOne!.mockResolvedValue(role);

      const result = await service.signIn(user.phone, 'correct-password');

      expect(userService.validateUser).toHaveBeenCalledWith(
        user.phone,
        'correct-password',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        phone: user.phone,
        role: role.name,
        name: user.name,
      });
      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      userService.validateUser!.mockResolvedValue(null);

      await expect(
        service.signIn(user.phone, 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(roleService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    it('creates a new user and returns an access token', async () => {
      userService.create!.mockResolvedValue(user);
      roleService.findOne!.mockResolvedValue(role);

      const result = await service.signUp(
        user.name!,
        user.phone,
        'my-password',
      );

      expect(userService.create).toHaveBeenCalledWith({
        phone: user.phone,
        roleId: 2,
        password: 'my-password',
        name: user.name,
      });
      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });

    it('throws BadRequestException when the phone number already exists', async () => {
      userService.create!.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.signUp(user.name!, user.phone, 'my-password'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ServiceUnavailableException when user creation silently fails', async () => {
      userService.create!.mockRejectedValue({ code: 'SOME_OTHER_ERROR' });

      await expect(
        service.signUp(user.name!, user.phone, 'my-password'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('sendPhone', () => {
    it('delegates to usersService.saveVerificationCode for real phone numbers', async () => {
      userService.saveVerificationCode!.mockResolvedValue({
        message: 'sent',
      });

      const result = await service.sendPhone(user.phone);

      expect(userService.saveVerificationCode).toHaveBeenCalledWith(
        user.phone,
        expect.any(String),
      );
      expect(result).toEqual({ message: 'sent' });
    });

    it('returns the fixed test code for the whitelisted test phone number', async () => {
      const result = await service.sendPhone('09212921488');

      expect(result).toEqual({ code: '123456' });
      expect(userService.saveVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    it('throws UnauthorizedException when the code is invalid or expired', async () => {
      userService.findValidOtp!.mockResolvedValue(null);

      await expect(
        service.verifyCode(user.phone, '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns an access token for an existing user with a valid code', async () => {
      userService.findValidOtp!.mockResolvedValue({ id: 'otp-1' });
      userService.findByPhone!.mockResolvedValue(user);
      roleService.findOne!.mockResolvedValue(role);
      userService.expireValidOtp!.mockResolvedValue(undefined);

      const result = await service.verifyCode(user.phone, '123456');

      expect(userService.create).not.toHaveBeenCalled();
      expect(userService.expireValidOtp).toHaveBeenCalledWith(user.phone);
      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });

    it('creates a new user when verifying a code for an unknown phone number', async () => {
      userService.findValidOtp!.mockResolvedValue({ id: 'otp-1' });
      userService.findByPhone!.mockResolvedValue(null);
      userService.create!.mockResolvedValue(user);
      roleService.findOne!.mockResolvedValue(role);

      const result = await service.verifyCode(user.phone, '123456');

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: user.phone, roleId: 2, name: null }),
      );
      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });

    it('accepts the hardcoded test OTP even without a matching stored otp', async () => {
      userService.findValidOtp!.mockResolvedValue(null);
      userService.findByPhone!.mockResolvedValue(user);
      roleService.findOne!.mockResolvedValue(role);

      const result = await service.verifyCode('09212921488', '123456');

      expect(result).toEqual({ access_token: 'signed-jwt-token' });
    });
  });
});
