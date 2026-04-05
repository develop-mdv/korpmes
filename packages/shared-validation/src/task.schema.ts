import { z } from 'zod';
import { uuidSchema } from './common';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  chatId: uuidSchema.optional(),
  assignedTo: uuidSchema.optional(),
  dueDate: z.string().datetime().optional(),
  watcherIds: z.array(uuidSchema).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
});

export const assignTaskSchema = z.object({
  assignedTo: uuidSchema,
});
