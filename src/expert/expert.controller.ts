import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ExpertService } from './expert.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ExpertReviewSchema, PaginationSchema } from '../artifacts/dto';
import { ZodError } from 'zod';

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

@Controller('expert')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT' as any, 'ADMIN' as any)
export class ExpertController {
  constructor(private readonly expert: ExpertService) {}

  // ─── Expert queue ───
  @Get('queue')
  async getQueue(@Query() query: any) {
    let pagination;
    try {
      pagination = PaginationSchema.parse(query);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }
    return this.expert.getQueue(pagination.page, pagination.limit);
  }

  // ─── Submit decision ───
  @Post('artifacts/:id/review')
  async submitReview(
    @Param('id') artifactId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      var dto = ExpertReviewSchema.parse(body);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }

    const user = (req as any).user;
    return this.expert.submitDecision(
      artifactId,
      user.userId,
      dto.decision as any,
      dto.notes,
      dto.checklist,
    );
  }

  // ─── Get reviews for an artifact ───
  @Get('artifacts/:id/reviews')
  async getReviews(@Param('id') artifactId: string) {
    return this.expert.getReviews(artifactId);
  }
}