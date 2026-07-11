import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { jwtConstants } from './constants';

function createContext(headers: Record<string, string>): ExecutionContext {
  const request: any = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: jwtConstants.secret });
    guard = new AuthGuard(jwtService);
  });

  it('allows access and attaches the decoded payload when the token is valid', async () => {
    const payload = { sub: 'user-1', role: 'ADMIN' };
    const token = await jwtService.signAsync(payload);
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toMatchObject(payload);
  });

  it('throws UnauthorizedException when there is no Authorization header', async () => {
    const context = createContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the scheme is not Bearer', async () => {
    const context = createContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the token is malformed', async () => {
    const context = createContext({ authorization: 'Bearer not-a-real-jwt' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the token was signed with a different secret', async () => {
    const otherJwtService = new JwtService({ secret: 'a-different-secret' });
    const token = await otherJwtService.signAsync({ sub: 'user-1' });
    const context = createContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the token is expired', async () => {
    const token = await jwtService.signAsync(
      { sub: 'user-1' },
      { expiresIn: '-1s' },
    );
    const context = createContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
