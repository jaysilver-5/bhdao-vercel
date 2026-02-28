import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common"

@Injectable()
export class ExpertGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest()
    const user = req.user
    if (!user) return false
    if (user.role !== "EXPERT" && user.role !== "ADMIN") {
      throw new ForbiddenException("Expert access only")
    }
    return true
  }
}