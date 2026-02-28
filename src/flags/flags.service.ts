import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { FlagReason } from '../generated/prisma/client';

@Injectable()
export class FlagsService {
  private readonly flagThreshold: number;

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {
    this.flagThreshold = parseInt(this.cfg.get<string>('FLAG_THRESHOLD') ?? '3', 10);
  }

  async createFlag(
    artifactId: string,
    reporterId: string,
    reason: FlagReason,
    details?: string,
  ) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');

    // Check duplicate
    const existing = await this.prisma.flag.findUnique({
      where: { artifactId_reporterId: { artifactId, reporterId } },
    });
    if (existing) throw new ConflictException('You have already flagged this artifact');

    const flag = await this.prisma.flag.create({
      data: { artifactId, reporterId, reason, details },
    });

    // Emit event
    await this.prisma.artifactEvent.create({
      data: {
        artifactId,
        actorId: reporterId,
        type: 'FLAGGED',
        payload: { reason, details },
      },
    });

    // Auto-flag if threshold reached
    const flagCount = await this.prisma.flag.count({ where: { artifactId } });
    if (flagCount >= this.flagThreshold && artifact.status !== 'FLAGGED') {
      await this.prisma.artifact.update({
        where: { id: artifactId },
        data: { status: 'FLAGGED' },
      });

      await this.prisma.artifactEvent.create({
        data: {
          artifactId,
          actorId: reporterId,
          type: 'STATUS_CHANGE',
          payload: {
            from: artifact.status,
            to: 'FLAGGED',
            reason: `Auto-flagged: ${flagCount} flags reached threshold of ${this.flagThreshold}`,
          },
        },
      });
    }

    return flag;
  }

  async getFlags(artifactId: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');

    return this.prisma.flag.findMany({
      where: { artifactId },
      include: {
        reporter: { select: { id: true, wallet: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}