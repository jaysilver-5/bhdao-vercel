import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaginationSchema } from '../artifacts/dto';
import { ZodError, z } from 'zod';

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

const SetRoleSchema = z.object({
  role: z.enum(['MEMBER', 'EXPERT', 'ADMIN']),
});

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN' as any)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ─── Dashboard stats ───
  @Get('stats')
  async getStats() {
    return this.admin.getStats();
  }

  // ─── List users ───
  @Get('users')
  async listUsers(@Query() query: any) {
    let pagination;
    try {
      pagination = PaginationSchema.parse(query);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }
    return this.admin.listUsers(pagination.page, pagination.limit, query.role);
  }

  // ─── Set user role ───
  @Patch('users/:id/role')
  async setRole(@Param('id') id: string, @Body() body: any) {
    try {
      var dto = SetRoleSchema.parse(body);
    } catch (e: any) {
      if (e instanceof ZodError) throw new BadRequestException(formatZodError(e));
      throw e;
    }
    return this.admin.setRole(id, dto.role as any);
  }

  // ─── Recent events ───
  @Get('events')
  async recentEvents(@Query('limit') limit?: string) {
    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    return this.admin.recentEvents(take);
  }
}