import { z } from 'zod';

// ─── Artifact ───

export const CreateArtifactSchema = z.object({
  title: z.string().min(3).max(256),
  description: z.string().min(10).max(5000),
  type: z.enum(['image', 'audio', 'video', 'document', 'text']),
  sourceUrl: z.string().url().optional(),
  language: z.string().min(2).max(10).default('en'),
  license: z.string().max(128).optional(),
  tags: z.array(z.string().max(64)).max(20).default([]),
});
export type CreateArtifactDto = z.infer<typeof CreateArtifactSchema>;

export const UpdateArtifactSchema = z.object({
  title: z.string().min(3).max(256).optional(),
  description: z.string().min(10).max(5000).optional(),
  sourceUrl: z.string().url().optional(),
  language: z.string().min(2).max(10).optional(),
  license: z.string().max(128).optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
});
export type UpdateArtifactDto = z.infer<typeof UpdateArtifactSchema>;

// ─── Vote ───

export const CastVoteSchema = z.object({
  value: z.enum(['APPROVE', 'REJECT']),
});
export type CastVoteDto = z.infer<typeof CastVoteSchema>;

// ─── Flag ───

export const CreateFlagSchema = z.object({
  reason: z.enum(['MISINFO', 'COPYRIGHT', 'DUPLICATE', 'OTHER']),
  details: z.string().max(2000).optional(),
});
export type CreateFlagDto = z.infer<typeof CreateFlagSchema>;

// ─── Expert Review ───

export const ExpertReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(5000).optional(),
  checklist: z.record(z.string(), z.boolean()).optional(),
});
export type ExpertReviewDto = z.infer<typeof ExpertReviewSchema>;

// ─── Comment ───

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

// ─── Pagination ───

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationDto = z.infer<typeof PaginationSchema>;