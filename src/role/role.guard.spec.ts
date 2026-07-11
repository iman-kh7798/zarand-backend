import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './role.guard';
import { Role } from './role.enum';
import { ROLES_KEY } from './role.decorator';

function createContext(user: { role?: Role } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when the route has no @Roles metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(createContext({ role: Role.User }));

    expect(result).toBe(true);
  });

  it('allows access when the route has an empty roles array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const result = guard.canActivate(createContext({ role: Role.User }));

    expect(result).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.Admin, Role.Owner]);

    const result = guard.canActivate(createContext({ role: Role.Owner }));

    expect(result).toBe(true);
  });

  it('denies access when the user role is not in the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);

    const result = guard.canActivate(createContext({ role: Role.User }));

    expect(result).toBe(false);
  });

  it('denies access when there is no authenticated user on the request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.Admin]);

    const result = guard.canActivate(createContext(undefined));

    expect(result).toBe(false);
  });
});
