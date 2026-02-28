import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  private readonly minVotes: number;
  private readonly approveRatio: number;
  private systemUserId: string | null = null;

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {
    this.minVotes = parseInt(this.cfg.get<string>('MIN_VOTES') ?? '3', 10);
    this.approveRatio = parseFloat(this.cfg.get<string>('APPROVE_RATIO') ?? '0.6');
  }

  // Get or create a SYSTEM user for cron-driven audit events
  private async getSystemUserId(): Promise<string> {
    if (this.systemUserId) return this.systemUserId;

    const system = await this.prisma.user.upsert({
      where: { wallet: 'SYSTEM' },
      update: {},
      create: { wallet: 'SYSTEM', role: 'ADMIN' },
    });

    this.systemUserId = system.id;
    return system.id;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReviewTransitions() {
    this.logger.log('Checking for expired community reviews...');

    // Find all artifacts where review window has closed
    const expired = await this.prisma.artifact.findMany({
      where: {
        status: 'COMMUNITY_REVIEW',
        reviewEndsAt: { lte: new Date() },
      },
    });

    if (expired.length === 0) {
      this.logger.log('No expired reviews found.');
      return;
    }

    this.logger.log(`Found ${expired.length} expired review(s). Processing...`);

    for (const artifact of expired) {
      await this.evaluateArtifact(artifact.id);
    }
  }

  async evaluateArtifact(artifactId: string) {
    const votes = await this.prisma.vote.findMany({
      where: { artifactId },
    });

    const approves = votes.filter((v) => v.value === 'APPROVE').length;
    const total = votes.length;
    const ratio = total > 0 ? approves / total : 0;

    let newStatus: 'EXPERT_REVIEW' | 'REJECTED';
    let reason: string;

    if (total < this.minVotes) {
      newStatus = 'REJECTED';
      reason = `Insufficient votes: ${total}/${this.minVotes} minimum`;
    } else if (ratio >= this.approveRatio) {
      newStatus = 'EXPERT_REVIEW';
      reason = `Approved by community: ${approves}/${total} (${Math.round(ratio * 100)}%) meets ${this.approveRatio * 100}% threshold`;
    } else {
      newStatus = 'REJECTED';
      reason = `Rejected by community: ${approves}/${total} (${Math.round(ratio * 100)}%) below ${this.approveRatio * 100}% threshold`;
    }

    await this.prisma.artifact.update({
      where: { id: artifactId },
      data: { status: newStatus },
    });

    const systemId = await this.getSystemUserId();

    await this.prisma.artifactEvent.create({
      data: {
        artifactId,
        actorId: systemId,
        type: 'STATUS_CHANGE',
        payload: {
          from: 'COMMUNITY_REVIEW',
          to: newStatus,
          reason,
          votes: { approve: approves, reject: total - approves, total },
        },
      },
    });

    this.logger.log(`Artifact ${artifactId} → ${newStatus}: ${reason}`);
  }
}