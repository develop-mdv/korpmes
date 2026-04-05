import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /** Fire-and-forget audit write — never throws. */
  log(dto: CreateAuditLogDto): void {
    this.repo
      .save(this.repo.create(dto))
      .catch((err) => console.error('[Audit] failed to write log:', err));
  }

  async getLogs(
    orgId: string,
    opts: { page?: number; limit?: number; action?: string; userId?: string },
  ) {
    const { page = 1, limit = 50, action, userId } = opts;

    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.organizationId = :orgId', { orgId })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (action) qb.andWhere('log.action LIKE :action', { action: `${action}%` });
    if (userId) qb.andWhere('log.userId = :userId', { userId });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
