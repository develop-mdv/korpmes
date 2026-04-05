import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema } from './common';

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(
    /^[a-z0-9-]+$/,
    'Slug must contain only lowercase letters, numbers, and hyphens',
  ),
  description: z.string().max(500).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const inviteMemberSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']),
}).refine(
  (data) => data.email || data.phone,
  { message: 'At least email or phone must be provided' },
);

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentDepartmentId: uuidSchema.optional(),
});
