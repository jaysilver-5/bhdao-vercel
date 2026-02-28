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
import { FlagsService } from './flags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateFlagSchema } from '../artifacts/dto';
import { ZodError } from 'zod';

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

@Controller('artifacts/:id/flags')
export class FlagsController {
  constructor(private readonly flags: FlagsService) {}

  // ─── Flag an artifact ───
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Param('id') artifactId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      var dto = CreateFlagSchema.parse(body);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }
    const user = (req as any).user;
    return this.flags.createFlag(artifactId, user.userId, dto.reason as any, dto.details);
  }

  // ─── View flags (expert/admin only) ───
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EXPERT' as any, 'ADMIN' as any)
  @Get()
  async getFlags(@Param('id') artifactId: string) {
    return this.flags.getFlags(artifactId);
  }
}