import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { NonceRequestSchema, VerifyRequestSchema } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('nonce')
  async nonce(@Body() body: any) {
    const dto = NonceRequestSchema.parse(body);
    return this.auth.issueNonce(dto.wallet);
  }

  @Post('verify')
  async verify(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const dto = VerifyRequestSchema.parse(body);
    const { jwt, user } = await this.auth.verifyAndLogin(dto.wallet, dto.signature);

    // Set cookie (works same-origin and localhost same-domain)
    res.cookie('bhdao_session', jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // Also return token in body so frontend can use Authorization header
    // as fallback for cross-origin scenarios
    return {
      ok: true,
      token: jwt,
      user: { id: user.id, wallet: user.wallet, role: user.role },
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('bhdao_session', { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user = (req as any).user;
    return {
      ok: true,
      user: {
        userId: user.userId,
        wallet: user.wallet,
        role: user.role,
      },
    };
  }
}