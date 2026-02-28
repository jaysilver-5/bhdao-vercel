import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { CreateCommentSchema, PaginationSchema } from '../artifacts/dto';
import { ZodError } from 'zod';

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

@Controller('artifacts/:id/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  // ─── Post comment ───
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Param('id') artifactId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      var dto = CreateCommentSchema.parse(body);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }
    const user = (req as any).user;
    return this.comments.create(artifactId, user.userId, dto.body);
  }

  // ─── List comments ───
  @UseGuards(JwtOptionalGuard)
  @Get()
  async findAll(@Param('id') artifactId: string, @Query() query: any) {
    let pagination;
    try {
      pagination = PaginationSchema.parse(query);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }
    return this.comments.findAll(artifactId, pagination.page, pagination.limit);
  }
}