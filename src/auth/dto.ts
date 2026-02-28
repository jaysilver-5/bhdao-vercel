import { z } from 'zod';

export const NonceRequestSchema = z.object({
  wallet: z.string().min(1, 'Wallet address is required'),
});
export type NonceRequestDto = z.infer<typeof NonceRequestSchema>;

export const VerifyRequestSchema = z.object({
  wallet: z.string().min(1, 'Wallet address is required'),
  signature: z.string().min(1, 'Signature is required'),
});
export type VerifyRequestDto = z.infer<typeof VerifyRequestSchema>;