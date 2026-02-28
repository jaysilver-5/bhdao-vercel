import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChainService } from '../chain/chain.service';
import { IpfsService } from '../ipfs/ipfs.service';
import { ExpertDecision } from '../generated/prisma/client';

@Injectable()
export class ExpertService {
  private readonly logger = new Logger(ExpertService.name);

  constructor(
    private prisma: PrismaService,
    private chain: ChainService,
    private ipfs: IpfsService,
  ) {}

  // ─── Queue: list all EXPERT_REVIEW artifacts ───

  async getQueue(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.artifact.findMany({
        where: { status: 'EXPERT_REVIEW' },
        orderBy: { createdAt: 'asc' }, // oldest first
        skip,
        take: limit,
        include: {
          submittedBy: { select: { id: true, wallet: true } },
          votes: { select: { value: true } },
          flags: { select: { reason: true } },
        },
      }),
      this.prisma.artifact.count({ where: { status: 'EXPERT_REVIEW' } }),
    ]);

    // Enrich with vote summary
    const enriched = items.map((a) => {
      const approves = a.votes.filter((v) => v.value === 'APPROVE').length;
      const rejects = a.votes.filter((v) => v.value === 'REJECT').length;
      const { votes, ...rest } = a;
      return {
        ...rest,
        voteSummary: { approve: approves, reject: rejects, total: votes.length },
        flagCount: a.flags.length,
      };
    });

    return { items: enriched, total, page, limit };
  }

  // ─── Submit expert decision ───

  async submitDecision(
    artifactId: string,
    expertId: string,
    decision: ExpertDecision,
    notes?: string,
    checklist?: Record<string, boolean>,
  ) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) throw new NotFoundException('Artifact not found');

    if (artifact.status !== 'EXPERT_REVIEW') {
      throw new BadRequestException(
        `Artifact is in ${artifact.status}, not EXPERT_REVIEW`,
      );
    }

    // Check for duplicate review
    const existing = await this.prisma.expertReview.findUnique({
      where: { artifactId_expertId: { artifactId, expertId } },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this artifact');
    }

    // Create review
    const review = await this.prisma.expertReview.create({
      data: {
        artifactId,
        expertId,
        decision,
        notes,
        checklist: checklist ?? undefined,
      },
    });

    // Transition status based on decision
    const newStatus = decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    await this.prisma.artifact.update({
      where: { id: artifactId },
      data: { status: newStatus },
    });

    // Emit EXPERT_REVIEWED event
    await this.prisma.artifactEvent.create({
      data: {
        artifactId,
        actorId: expertId,
        type: 'EXPERT_REVIEWED',
        payload: { decision, notes },
      },
    });

    // Emit STATUS_CHANGE event
    await this.prisma.artifactEvent.create({
      data: {
        artifactId,
        actorId: expertId,
        type: 'STATUS_CHANGE',
        payload: { from: 'EXPERT_REVIEW', to: newStatus },
      },
    });

    // Auto-pin to IPFS and anchor to Paseo if approved
    let anchor: { txHash: string; blockNumber: number } | null = null;
    let pin: { cid: string; gatewayUrl: string } | null = null;

    if (newStatus === 'VERIFIED') {
      // 1. Pin to IPFS first (so CID is available for chain anchor)
      try {
        pin = await this.ipfs.pinArtifact(artifactId, expertId);
        this.logger.log(`Auto-pinned ${artifactId}: CID=${pin.cid}`);
      } catch (e: any) {
        this.logger.error(`Auto-pin failed for ${artifactId}: ${e?.message}`);
      }

      // 2. Anchor to Paseo (includes CID if pin succeeded)
      try {
        anchor = await this.chain.anchorProof(artifactId, expertId);
        if (anchor) {
          this.logger.log(`Auto-anchored ${artifactId}: tx=${anchor.txHash}`);
        }
      } catch (e: any) {
        this.logger.error(`Auto-anchor failed for ${artifactId}: ${e?.message}`);
      }
    }

    return {
      review,
      newStatus,
      pin: pin
        ? { cid: pin.cid, gatewayUrl: pin.gatewayUrl }
        : null,
      anchor: anchor
        ? {
            txHash: anchor.txHash,
            blockNumber: anchor.blockNumber,
            explorerUrl: `https://paseo.subscan.io/extrinsic/${anchor.txHash}`,
          }
        : null,
    };
  }

  // ─── Get reviews for an artifact ───

  async getReviews(artifactId: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) throw new NotFoundException('Artifact not found');

    return this.prisma.expertReview.findMany({
      where: { artifactId },
      include: {
        expert: { select: { id: true, wallet: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}