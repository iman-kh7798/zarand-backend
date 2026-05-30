// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

export const ROLES_KEY = 'role';
export const Roles = (...roles: Role[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
