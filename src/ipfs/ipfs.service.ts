import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Use Pinata REST API directly — avoids SDK version mismatches
const PINATA_API = 'https://api.pinata.cloud';

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly jwt: string;
  private readonly gateway: string;

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {
    this.jwt = this.cfg.get<string>('PINATA_JWT') ?? '';
    this.gateway = this.cfg.get<string>('PINATA_GATEWAY') ?? '';

    if (!this.jwt) {
      this.logger.warn('PINATA_JWT not set — IPFS pinning disabled');
    }
  }

  private gatewayUrl(cid: string): string {
    return this.gateway
      ? `https://${this.gateway}/ipfs/${cid}`
      : `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.jwt}`,
    };
  }

  // ─── Pin JSON to IPFS ───

  private async pinJson(data: any, name: string): Promise<string> {
    const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: { name },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinata pinJSON failed (${res.status}): ${err}`);
    }

    const result = await res.json();
    return result.IpfsHash;
  }

  // ─── Pin file from URL to IPFS ───

  private async pinFromUrl(url: string, name: string): Promise<string> {
    // Download the file first
    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error(`Failed to fetch file from ${url}`);

    const blob = await fileRes.blob();
    const formData = new FormData();
    formData.append('file', blob, name);
    formData.append('pinataMetadata', JSON.stringify({ name }));

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: this.headers(),
      body: formData as any,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinata pinFile failed (${res.status}): ${err}`);
    }

    const result = await res.json();
    return result.IpfsHash;
  }

  // ─── Unpin ───

  async unpin(cid: string): Promise<void> {
    try {
      const res = await fetch(`${PINATA_API}/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
      if (res.ok) this.logger.log(`Unpinned: ${cid}`);
    } catch (e: any) {
      this.logger.error(`Unpin failed for ${cid}: ${e?.message ?? e}`);
    }
  }

  // ─── Pin artifact metadata + file ───

  async pinArtifact(artifactId: string, actorId: string): Promise<{
    cid: string;
    fileCid: string | null;
    gatewayUrl: string;
  }> {
    if (!this.jwt) {
      throw new BadRequestException('IPFS pinning not configured');
    }

    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
      include: {
        submittedBy: { select: { wallet: true } },
        expertReviews: {
          where: { decision: 'APPROVE' },
          include: { expert: { select: { wallet: true } } },
          take: 1,
        },
      },
    });

    if (!artifact) throw new BadRequestException('Artifact not found');
    if (artifact.status !== 'VERIFIED') {
      throw new BadRequestException('Only VERIFIED artifacts can be pinned');
    }
    if (artifact.cid) {
      throw new BadRequestException(`Already pinned: ${artifact.cid}`);
    }

    // 1. Pin the actual file from Cloudinary (if uploaded)
    let fileCid: string | null = null;

    if (artifact.fileUrl) {
      try {
        this.logger.log(`Pinning file from Cloudinary: ${artifact.fileUrl}`);
        fileCid = await this.pinFromUrl(artifact.fileUrl, `bhdao-file-${artifactId}`);
        this.logger.log(`File pinned: CID=${fileCid}`);
      } catch (e: any) {
        this.logger.error(`File pin failed: ${e?.message}`);
      }
    }

    // 2. Pin metadata JSON (includes file CID if available)
    const metadata = {
      artifactId: artifact.id,
      title: artifact.title,
      description: artifact.description,
      type: artifact.type,
      sourceUrl: artifact.sourceUrl,
      fileUrl: artifact.fileUrl,
      fileCid,
      language: artifact.language,
      license: artifact.license,
      tags: artifact.tags,
      submittedBy: artifact.submittedBy.wallet,
      verifiedBy: artifact.expertReviews[0]?.expert?.wallet ?? null,
      createdAt: artifact.createdAt.toISOString(),
      chainTxHash: artifact.chainTxHash,
      chainBlock: artifact.chainBlock,
    };

    this.logger.log(`Pinning metadata for ${artifactId}...`);

    try {
      const cid = await this.pinJson(metadata, `bhdao-artifact-${artifactId}`);

      // Update artifact with CID
      await this.prisma.artifact.update({
        where: { id: artifactId },
        data: { cid },
      });

      // Emit audit event
      await this.prisma.artifactEvent.create({
        data: {
          artifactId,
          actorId,
          type: 'PINNED',
          payload: { cid, fileCid, gatewayUrl: this.gatewayUrl(cid) },
        },
      });

      this.logger.log(`Pinned ${artifactId}: metadata CID=${cid}, file CID=${fileCid}`);

      return { cid, fileCid, gatewayUrl: this.gatewayUrl(cid) };
    } catch (e: any) {
      this.logger.error(`Metadata pin failed for ${artifactId}: ${e?.message ?? e}`);
      throw new BadRequestException(`IPFS pin failed: ${e?.message ?? 'unknown error'}`);
    }
  }
}