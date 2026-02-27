import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface CurrentUserData {
  id: string;
  email: string;
  role: Role;
}
