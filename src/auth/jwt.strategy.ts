import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

function cookieExtractor(req: any): string | null {
  // Try req.cookies first (if cookie-parser is installed)
  if (req?.cookies?.bhdao_session) {
    return req.cookies.bhdao_session;
  }

  // Fallback: manually parse Cookie header
  if (req?.headers?.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name === 'bhdao_session') {
        return rest.join('=');
      }
    }
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      wallet: payload.wallet,
      role: payload.role,
    };
  }
}