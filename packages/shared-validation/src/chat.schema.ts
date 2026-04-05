import { z } from 'zod';
import { uuidSchema } from './common';

export const createChatSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP', 'CHANNEL']),
  name: z.string().min(1).max(100).optional(),
  memberIds: z.array(uuidSchema).min(1),
}).refine(
  (data) => data.type !== 'GROUP' || data.name !== undefined,
  { message: 'Name is required for group chats', path: ['name'] },
);

export const updateChatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const addMemberSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).optional(),
});
