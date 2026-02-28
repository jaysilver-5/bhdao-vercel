import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  // Don't throw if no token — just continue with req.user = undefined
  handleRequest(err: any, user: any) {
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    // Run the JWT strategy but don't fail if missing
    return super.canActivate(context);
  }
}