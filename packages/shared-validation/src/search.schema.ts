import { z } from 'zod';
import { uuidSchema, cursorPaginationSchema } from './common';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  scope: z.enum(['ALL', 'MESSAGES', 'FILES', 'TASKS', 'MEMBERS']).default('ALL'),
  organizationId: uuidSchema,
  chatId: uuidSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).merge(cursorPaginationSchema);
