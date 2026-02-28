// src/prisma/prisma.service.ts
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  INestApplication,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Please define it in your environment/.env file.',
      );
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    PrismaService.pool = pool;

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (PrismaService.pool) {
      await PrismaService.pool.end();
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    app.enableShutdownHooks();
  }
}