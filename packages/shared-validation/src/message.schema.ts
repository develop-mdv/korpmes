import { z } from 'zod';
import { uuidSchema } from './common';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4096),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM']).default('TEXT'),
  parentMessageId: uuidSchema.optional(),
  fileIds: z.array(uuidSchema).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4096),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});
