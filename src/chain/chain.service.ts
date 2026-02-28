import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { createHash } from 'crypto';

@Injectable()
export class ChainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainService.name);
  private api: ApiPromise | null = null;
  private signer: any = null;

  private readonly rpcUrl: string;
  private readonly seed: string;

  constructor(
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {
    this.rpcUrl = this.cfg.get<string>('POLKADOT_RPC') ?? 'wss://rpc.ibp.network/paseo';
    this.seed = this.cfg.get<string>('ANCHOR_SEED') ?? '//Alice';
  }

  async onModuleInit() {
    try {
      const provider = new WsProvider(this.rpcUrl);
      this.api = await ApiPromise.create({ provider });

      const keyring = new Keyring({ type: 'sr25519' });
      this.signer = keyring.addFromUri(this.seed);

      this.logger.log(`Connected to ${this.rpcUrl}`);
      this.logger.log(`Anchor wallet: ${this.signer.address}`);
    } catch (e) {
      this.logger.error(`Failed to connect to Polkadot node: ${e}`);
      // Don't crash the app — anchoring is optional
    }
  }

  async onModuleDestroy() {
    if (this.api) {
      await this.api.disconnect();
      this.logger.log('Disconnected from Polkadot node');
    }
  }

  // ─── Build canonical proof hash ───

  buildProofPayload(artifact: {
    id: string;
    title: string;
    cid?: string | null;
    submittedById: string;
    submittedByWallet: string;
    expertId: string;
    expertWallet: string;
    verifiedAt: string;
  }) {
    const canonical = JSON.stringify({
      artifactId: artifact.id,
      title: artifact.title,
      cid: artifact.cid || null,
      submittedBy: artifact.submittedByWallet,
      verifiedAt: artifact.verifiedAt,
      expertWallet: artifact.expertWallet,
    });

    const hash = createHash('sha256').update(canonical).digest('hex');

    return { canonical, hash };
  }

  // ─── Anchor proof to Paseo via system.remark ───

  async anchorProof(artifactId: string, expertId: string): Promise<{
    txHash: string;
    blockNumber: number;
  } | null> {
    if (!this.api || !this.signer) {
      this.logger.warn('Chain not connected — skipping anchor');
      return null;
    }

    // Fetch artifact with relations
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
      include: {
        submittedBy: { select: { id: true, wallet: true } },
      },
    });

    if (!artifact) {
      this.logger.error(`Artifact ${artifactId} not found`);
      return null;
    }

    // Fetch expert wallet
    const expert = await this.prisma.user.findUnique({
      where: { id: expertId },
    });

    if (!expert) {
      this.logger.error(`Expert ${expertId} not found`);
      return null;
    }

    const now = new Date().toISOString();
    const { canonical, hash } = this.buildProofPayload({
      id: artifact.id,
      title: artifact.title,
      cid: artifact.cid,
      submittedById: artifact.submittedBy.id,
      submittedByWallet: artifact.submittedBy.wallet,
      expertId: expert.id,
      expertWallet: expert.wallet,
      verifiedAt: now,
    });

    this.logger.log(`Anchoring artifact ${artifactId}`);
    this.logger.log(`Proof hash: ${hash}`);

    try {
      // Build remark with prefix for easy identification
      const remark = `BHDAO:v1:${hash}`;

      const result = await new Promise<{ txHash: string; blockNumber: number }>(
        (resolve, reject) => {
          this.api!.tx.system
            .remark(remark)
            .signAndSend(this.signer, ({ status, txHash, events }) => {
              if (status.isInBlock) {
                const blockHash = status.asInBlock.toString();
                this.logger.log(`Tx in block: ${blockHash}`);

                // Get block number
                this.api!.rpc.chain
                  .getHeader(blockHash as any)
                  .then((header) => {
                    resolve({
                      txHash: txHash.toString(),
                      blockNumber: header.number.toNumber(),
                    });
                  })
                  .catch(reject);
              } else if (status.isFinalized) {
                this.logger.log(`Tx finalized: ${status.asFinalized.toString()}`);
              } else if (status.isDropped || status.isInvalid) {
                reject(new Error(`Transaction failed: ${status.type}`));
              }
            })
            .catch(reject);
        },
      );

      // Update artifact with chain proof
      await this.prisma.artifact.update({
        where: { id: artifactId },
        data: {
          chainTxHash: result.txHash,
          chainBlock: result.blockNumber,
          anchoredAt: new Date(now),
        },
      });

      // Emit audit event
      await this.prisma.artifactEvent.create({
        data: {
          artifactId,
          actorId: expertId,
          type: 'ANCHORED',
          payload: {
            txHash: result.txHash,
            blockNumber: result.blockNumber,
            proofHash: hash,
            canonical,
            network: 'paseo',
          },
        },
      });

      this.logger.log(`Anchored: tx=${result.txHash} block=${result.blockNumber}`);

      return result;
    } catch (e) {
      this.logger.error(`Anchor failed for ${artifactId}: ${e}`);
      return null;
    }
  }

  // ─── Verify a proof (for public verification endpoint) ───

  verifyProof(artifact: {
    id: string;
    title: string;
    cid?: string | null;
    submittedByWallet: string;
    expertWallet: string;
    verifiedAt: string;
  }): { hash: string; canonical: string } {
    return this.buildProofPayload({
      ...artifact,
      submittedById: '',
      expertId: '',
    });
  }
}