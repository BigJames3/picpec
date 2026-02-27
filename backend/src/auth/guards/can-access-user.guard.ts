import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUserData } from '../auth.types';

/**
 * Guard RBAC : autorise l'accès à GET /users/:id uniquement si :
 * - L'utilisateur demande son propre profil (id === user.id)
 * - OU l'utilisateur a le rôle ADMIN ou SUPER_ADMIN
 */
@Injectable()
export class CanAccessUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user: CurrentUserData;
      params: { id: string };
    }>();
    const user = request.user;
    const targetId = request.params?.id;

    if (!user || !targetId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const isOwnProfile = user.id === targetId;
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    if (isOwnProfile || isAdmin) {
      return true;
    }

    throw new ForbiddenException('Vous ne pouvez accéder qu\'à votre propre profil');
  }
}
