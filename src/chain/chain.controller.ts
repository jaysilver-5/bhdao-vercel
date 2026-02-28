import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ChainService } from './chain.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('chain')
export class ChainController {
  constructor(
    private readonly chain: ChainService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Manually anchor a verified artifact (admin/expert) ───
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EXPERT' as any, 'ADMIN' as any)
  @Post('artifacts/:id/anchor')
  async anchor(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;

    const artifact = await this.prisma.artifact.findUnique({ where: { id } });
    if (!artifact) throw new NotFoundException('Artifact not found');

    if (artifact.status !== 'VERIFIED') {
      throw new BadRequestException('Only VERIFIED artifacts can be anchored');
    }

    if (artifact.chainTxHash) {
      throw new BadRequestException('Artifact is already anchored on-chain');
    }

    const result = await this.chain.anchorProof(id, user.userId);

    if (!result) {
      throw new BadRequestException('Anchoring failed — chain may be unavailable');
    }

    return {
      ok: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      explorerUrl: `https://paseo.subscan.io/extrinsic/${result.txHash}`,
    };
  }

  // ─── Get chain proof for an artifact (public) ───
  @Get('artifacts/:id/proof')
  async getProof(@Param('id') id: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { wallet: true } },
        expertReviews: {
          where: { decision: 'APPROVE' },
          include: { expert: { select: { wallet: true } } },
          take: 1,
        },
      },
    });

    if (!artifact) throw new NotFoundException('Artifact not found');

    if (!artifact.chainTxHash) {
      return {
        anchored: false,
        artifactId: id,
        status: artifact.status,
      };
    }

    return {
      anchored: true,
      artifactId: id,
      network: 'paseo',
      txHash: artifact.chainTxHash,
      blockNumber: artifact.chainBlock,
      anchoredAt: artifact.anchoredAt,
      explorerUrl: `https://paseo.subscan.io/extrinsic/${artifact.chainTxHash}`,
      artifact: {
        title: artifact.title,
        cid: artifact.cid,
        submittedBy: artifact.submittedBy.wallet,
        expertWallet: artifact.expertReviews[0]?.expert?.wallet ?? null,
      },
    };
  }
}