import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { IpfsService } from './ipfs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('ipfs')
export class IpfsController {
  constructor(
    private readonly ipfs: IpfsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Pin a verified artifact to IPFS ───
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EXPERT' as any, 'ADMIN' as any)
  @Post('artifacts/:id/pin')
  async pin(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const result = await this.ipfs.pinArtifact(id, user.userId);

    return {
      ok: true,
      cid: result.cid,
      gatewayUrl: result.gatewayUrl,
    };
  }

  // ─── Get IPFS info for an artifact (public) ───
  @Get('artifacts/:id')
  async getIpfsInfo(@Param('id') id: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      select: { id: true, cid: true, status: true, title: true },
    });

    if (!artifact) throw new NotFoundException('Artifact not found');

    if (!artifact.cid) {
      return { pinned: false, artifactId: id, status: artifact.status };
    }

    return {
      pinned: true,
      artifactId: id,
      cid: artifact.cid,
      ipfsUrl: `ipfs://${artifact.cid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${artifact.cid}`,
    };
  }
}