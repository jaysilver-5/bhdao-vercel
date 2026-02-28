import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { CastVoteSchema } from '../artifacts/dto';
import { ZodError } from 'zod';

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

@Controller('artifacts/:id/votes')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  // ─── Cast vote ───
  @UseGuards(JwtAuthGuard)
  @Post()
  async castVote(
    @Param('id') artifactId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      var dto = CastVoteSchema.parse(body);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }

    const user = (req as any).user;
    return this.votes.castVote(artifactId, user.userId, dto.value as any);
  }

  // ─── Vote summary (public for verified, auth-optional otherwise) ───
  @UseGuards(JwtOptionalGuard)
  @Get('summary')
  async getSummary(@Param('id') artifactId: string) {
    return this.votes.getSummary(artifactId);
  }

  // ─── Current user's vote on this artifact ───
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async getMyVote(
    @Param('id') artifactId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const vote = await this.votes.getUserVote(artifactId, user.userId);
    return { voted: !!vote, value: vote?.value ?? null };
  }
}