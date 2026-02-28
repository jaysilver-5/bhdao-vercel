import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── List users ───

  async listUsers(page: number, limit: number, role?: string) {
    const skip = (page - 1) * limit;
    const where = role ? { role: role as Role } : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          wallet: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              artifacts: true,
              votes: true,
              expertReviews: true,
              flags: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Set user role ───

  async setRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.wallet === 'SYSTEM') {
      throw new BadRequestException('Cannot modify SYSTEM user');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, wallet: true, role: true, createdAt: true },
    });
  }

  // ─── Dashboard stats ───

  async getStats() {
    const [
      totalUsers,
      totalArtifacts,
      pending,
      communityReview,
      expertReview,
      verified,
      rejected,
      flagged,
      withdrawn,
      totalVotes,
      totalComments,
      totalFlags,
      totalExpertReviews,
      anchored,
      pinned,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.artifact.count(),
      this.prisma.artifact.count({ where: { status: 'PENDING' } }),
      this.prisma.artifact.count({ where: { status: 'COMMUNITY_REVIEW' } }),
      this.prisma.artifact.count({ where: { status: 'EXPERT_REVIEW' } }),
      this.prisma.artifact.count({ where: { status: 'VERIFIED' } }),
      this.prisma.artifact.count({ where: { status: 'REJECTED' } }),
      this.prisma.artifact.count({ where: { status: 'FLAGGED' } }),
      this.prisma.artifact.count({ where: { status: 'WITHDRAWN' } }),
      this.prisma.vote.count(),
      this.prisma.comment.count(),
      this.prisma.flag.count(),
      this.prisma.expertReview.count(),
      this.prisma.artifact.count({ where: { chainTxHash: { not: null } } }),
      this.prisma.artifact.count({ where: { cid: { not: null } } }),
    ]);

    return {
      users: { total: totalUsers },
      artifacts: {
        total: totalArtifacts,
        byStatus: {
          pending,
          communityReview,
          expertReview,
          verified,
          rejected,
          flagged,
          withdrawn,
        },
        anchored,
        pinned,
      },
      activity: {
        votes: totalVotes,
        comments: totalComments,
        flags: totalFlags,
        expertReviews: totalExpertReviews,
      },
    };
  }

  // ─── Recent activity ───

  async recentEvents(limit: number) {
    return this.prisma.artifactEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        artifact: { select: { id: true, title: true, status: true } },
      },
    });
  }
}