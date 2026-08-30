// src/auth/roles.decorator.ts
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';
import { ApiOperation } from '@nestjs/swagger';

export const ROLES_KEY = 'role';
export const Roles = (...roles: Role[]) => {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiOperation({
      summary: `**Allowed roles:** ${roles.join(', ')}`,
    }),
  );
};
