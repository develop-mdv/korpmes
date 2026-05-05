export class CreateAuditLogDto {
  userId: string;
  userEmail?: string;
  organizationId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}
