import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(artifactId: string, authorId: string, body: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');

    const comment = await this.prisma.comment.create({
      data: { artifactId, authorId, body },
      include: {
        author: { select: { id: true, wallet: true } },
      },
    });

    await this.prisma.artifactEvent.create({
      data: {
        artifactId,
        actorId: authorId,
        type: 'COMMENTED',
        payload: { commentId: comment.id },
      },
    });

    return comment;
  }

  async findAll(artifactId: string, page: number, limit: number) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException('Artifact not found');

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { artifactId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, wallet: true } },
        },
      }),
      this.prisma.comment.count({ where: { artifactId } }),
    ]);

    return { items, total, page, limit };
  }
}