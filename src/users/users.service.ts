import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByWallet(wallet: string) {
    return this.prisma.user.findUnique({ where: { wallet } });
  }

  async upsertWallet(wallet: string) {
    return this.prisma.user.upsert({
      where: { wallet },
      update: {},
      create: { wallet, role: Role.MEMBER },
    });
  }

  async setRole(wallet: string, role: Role) {
    return this.prisma.user.update({ where: { wallet }, data: { role } });
  }
}