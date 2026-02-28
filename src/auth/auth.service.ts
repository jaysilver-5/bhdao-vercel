import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  normalize(wallet: string): string {
    return wallet.trim().toLowerCase();
  }

  buildMessage(wallet: string, nonce: string): string {
    return `BHDAO Login\nWallet: ${wallet}\nNonce: ${nonce}\nPurpose: Sign in to Black History DAO`;
  }

  async issueNonce(walletRaw: string) {
    const wallet = this.normalize(walletRaw);
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

    await this.prisma.authNonce.upsert({
      where: { wallet },
      update: { nonce, expiresAt },
      create: { wallet, nonce, expiresAt },
    });

    const message = this.buildMessage(wallet, nonce);

    this.logger.log(`Nonce issued for ${wallet}`);

    return { wallet, nonce, message, expiresAt };
  }

  async verifyAndLogin(walletRaw: string, signature: string) {
    const wallet = this.normalize(walletRaw);

    this.logger.log(`Verify attempt for: ${wallet}`);

    const rec = await this.prisma.authNonce.findUnique({ where: { wallet } });

    if (!rec) {
      this.logger.warn(`No nonce found for wallet: ${wallet}`);
      throw new UnauthorizedException('No nonce issued');
    }

    if (rec.expiresAt.getTime() < Date.now()) {
      this.logger.warn(`Nonce expired for wallet: ${wallet}`);
      throw new UnauthorizedException('Nonce expired');
    }

    const message = this.buildMessage(wallet, rec.nonce);

    this.logger.log(`Message to verify: ${JSON.stringify(message)}`);

    let recovered = '';
    try {
      recovered = ethers.verifyMessage(message, signature).toLowerCase();
    } catch (e) {
      this.logger.error(`Signature verification error: ${e}`);
      throw new UnauthorizedException('Signature verification failed');
    }

    this.logger.log(`Recovered: ${recovered} | Expected: ${wallet}`);

    if (recovered !== wallet) {
      throw new UnauthorizedException('Wallet mismatch');
    }

    // Consume nonce
    await this.prisma.authNonce.delete({ where: { wallet } }).catch(() => null);

    // Upsert user
    const user = await this.users.upsertWallet(wallet);

    // Sign JWT
    const token = await this.jwt.signAsync({
      sub: user.id,
      wallet: user.wallet,
      role: user.role,
    });

    this.logger.log(`Login success for ${wallet}`);

    return { jwt: token, user };
  }
}