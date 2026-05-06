import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgPermissionsGuard } from '../../common/guards/org-permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { AuditService, AuditQueryOptions } from './audit.service';
import type { AuditLog } from './entities/audit-log.entity';

const CSV_HARD_LIMIT = 100000;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[";\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(log: AuditLog): string {
  const created = log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt);
  return [
    csvEscape(created),
    csvEscape(log.userEmail ?? ''),
    csvEscape(log.userId ?? ''),
    csvEscape(log.action),
    csvEscape(log.entityType ?? ''),
    csvEscape(log.entityId ?? ''),
    csvEscape(log.ipAddress ?? ''),
    csvEscape(log.metadata ?? ''),
  ].join(';');
}

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgPermissionsGuard)
@RequirePermissions('ORG_VIEW_AUDIT')
@Controller('audit')
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  getLogs(
    @Query('orgId') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('q') q?: string,
  ) {
    if (!orgId) throw new BadRequestException('orgId is required');
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      throw new BadRequestException('dateFrom must be earlier than dateTo');
    }
    const opts: AuditQueryOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
      action,
      userId,
      dateFrom,
      dateTo,
      q,
    };
    return this.auditService.getLogs(orgId, opts);
  }

  @Get('logs/export')
  @SkipTransform()
  async exportLogs(
    @Query('orgId') orgId: string,
    @Query('action') action: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('q') q: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!orgId) throw new BadRequestException('orgId is required');
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      throw new BadRequestException('dateFrom must be earlier than dateTo');
    }

    const { items, truncated } = await this.auditService.getLogsForExport(
      orgId,
      { action, userId, dateFrom, dateTo, q },
      CSV_HARD_LIMIT,
    );

    this.logger.log(
      `[Audit Export] orgId=${orgId} rows=${items.length} truncated=${truncated}`,
    );

    const filename = `audit-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (truncated) res.setHeader('X-Export-Truncated', 'true');

    const headerRow = [
      'created_at',
      'user_email',
      'user_id',
      'action',
      'entity_type',
      'entity_id',
      'ip_address',
      'metadata',
    ].join(';');

    const lines = [headerRow, ...items.map((log) => rowToCsv(log))];

    // UTF-8 BOM (﻿) so Excel ru-RU renders Cyrillic correctly.
    res.send('﻿' + lines.join('\r\n') + '\r\n');
  }
}
