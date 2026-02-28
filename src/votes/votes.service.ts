import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VoteValue } from '../generated/prisma/client';

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async castVote(artifactId: string, voterId: string, value: VoteValue) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) throw new NotFoundException('Artifact not found');

    // Must be in COMMUNITY_REVIEW
    if (artifact.status !== 'COMMUNITY_REVIEW') {
      throw new BadRequestException('Voting is only allowed during community review');
    }

    // Must be before deadline
    if (artifact.reviewEndsAt && artifact.reviewEndsAt.getTime() < Date.now()) {
      throw new BadRequestException('Review window has closed');
    }

    // Cannot vote on own submission
    if (artifact.submittedById === voterId) {
      throw new ForbiddenException('Cannot vote on your own submission');
    }

    // Check for duplicate vote
    const existing = await this.prisma.vote.findUnique({
      where: { artifactId_voterId: { artifactId, voterId } },
    });

    if (existing) {
      throw new ConflictException('You have already voted on this artifact');
    }

    // Create vote
    const vote = await this.prisma.vote.create({
      data: { artifactId, voterId, value },
    });

    // Emit audit event
    await this.prisma.artifactEvent.create({
      data: {
        artifactId,
        actorId: voterId,
        type: 'VOTED',
        payload: { value },
      },
    });

    return vote;
  }

  async getSummary(artifactId: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) throw new NotFoundException('Artifact not found');

    const votes = await this.prisma.vote.findMany({
      where: { artifactId },
    });

    const approve = votes.filter((v) => v.value === 'APPROVE').length;
    const reject = votes.filter((v) => v.value === 'REJECT').length;
    const total = votes.length;
    const ratio = total > 0 ? approve / total : 0;

    return {
      artifactId,
      approve,
      reject,
      total,
      ratio: Math.round(ratio * 100) / 100,
      status: artifact.status,
      reviewEndsAt: artifact.reviewEndsAt,
    };
  }

  async getUserVote(artifactId: string, voterId: string) {
    const vote = await this.prisma.vote.findUnique({
      where: { artifactId_voterId: { artifactId, voterId } },
    });

    return vote ? { value: vote.value } : null;
  }
}