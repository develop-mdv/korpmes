import { z } from 'zod';
import { uuidSchema } from './common';

export const createChatSchema = z.object({
  type: z.enum(['PERSONAL', 'GROUP', 'CHANNEL', 'PROJECT']),
  organizationId: uuidSchema.nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  memberIds: z.array(uuidSchema).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, 'Members must be unique'),
}).refine(
  (data) => data.type === 'PERSONAL' || Boolean(data.name?.trim()),
  { message: 'Name is required for group chats', path: ['name'] },
).refine((data) => Boolean(data.organizationId) || ['PERSONAL', 'GROUP'].includes(data.type), {
  message: 'Personal spaces support direct and group chats', path: ['type'],
});

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
