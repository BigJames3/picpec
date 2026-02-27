import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserData } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;
    return data ? user?.[data] : user;
  },
);
