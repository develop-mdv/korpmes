import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WS_EVENTS } from '@corp/shared-constants';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { getRequestContext } from '../../common/context/request-context';
import { WebSocketService } from '../websocket/websocket.service';

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    @Optional() private readonly wsService?: WebSocketService,
  ) {}

  /** Fire-and-forget audit write — never throws. */
  log(dto: CreateAuditLogDto): void {
    const enriched: CreateAuditLogDto = { ...dto };
    if (!enriched.ipAddress) {
      const ctx = getRequestContext();
      if (ctx?.ip) enriched.ipAddress = ctx.ip;
    }
    this.repo
      .save(this.repo.create(enriched))
      .then((saved) => {
        if (this.wsService && saved.organizationId) {
          this.wsService.emitToOrgAudit(saved.organizationId, WS_EVENTS.AUDIT_LOG_NEW, saved);
        }
      })
      .catch((err) => console.error('[Audit] failed to write log:', err));
  }

  buildQueryBuilder(orgId: string, opts: AuditQueryOptions) {
    const { action, userId, dateFrom, dateTo, q } = opts;
    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.organizationId = :orgId', { orgId })
      .orderBy('log.createdAt', 'DESC');

    if (action) qb.andWhere('log.action LIKE :action', { action: `${action}%` });
    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (dateFrom) qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    if (dateTo) qb.andWhere('log.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    if (q) {
      qb.andWhere(
        '(log.userEmail ILIKE :q OR log.entityId ILIKE :q OR log.action ILIKE :q)',
        { q: `%${q}%` },
      );
    }
    return qb;
  }

  async getLogs(orgId: string, opts: AuditQueryOptions) {
    const { page = 1, limit = 50 } = opts;
    const qb = this.buildQueryBuilder(orgId, opts)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getLogsForExport(
    orgId: string,
    opts: AuditQueryOptions,
    hardLimit = 100000,
  ): Promise<{ items: AuditLog[]; truncated: boolean }> {
    const items = await this.buildQueryBuilder(orgId, opts).take(hardLimit).getMany();
    return { items, truncated: items.length >= hardLimit };
  }
}
