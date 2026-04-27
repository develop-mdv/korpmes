import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WS_EVENTS } from '@corp/shared-constants';
import { JoinRequest } from './entities/join-request.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from './organizations.service';

const APPROVAL_ROLES = new Set(['OWNER', 'ADMIN']);

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectRepository(JoinRequest)
    private readonly joinRequestRepo: Repository<JoinRequest>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    private readonly notifications: NotificationsService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(orgId: string, userId: string, message?: string): Promise<JoinRequest> {
    const org = await this.organizationRepo.findOne({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const existingMember = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (existingMember) {
      throw new BadRequestException('You are already a member of this organization');
    }

    const existingPending = await this.joinRequestRepo.findOne({
      where: { organizationId: orgId, userId, status: 'PENDING' },
    });
    if (existingPending) {
      return existingPending;
    }

    const request = this.joinRequestRepo.create({
      organizationId: orgId,
      userId,
      status: 'PENDING',
      message: message ?? null,
    });
    const saved = await this.joinRequestRepo.save(request);

    await this.notifyApprovers(orgId, saved, org.name);

    return saved;
  }

  async listPending(orgId: string, requesterId: string): Promise<JoinRequest[]> {
    await this.assertApprover(orgId, requesterId);
    return this.joinRequestRepo.find({
      where: { organizationId: orgId, status: 'PENDING' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyPending(orgId: string, userId: string): Promise<JoinRequest | null> {
    return this.joinRequestRepo.findOne({
      where: { organizationId: orgId, userId, status: 'PENDING' },
    });
  }

  async getMyAllPending(userId: string): Promise<JoinRequest[]> {
    return this.joinRequestRepo.find({
      where: { userId, status: 'PENDING' },
    });
  }

  async approve(orgId: string, requestId: string, approverId: string): Promise<JoinRequest> {
    await this.assertApprover(orgId, approverId);
    const request = await this.findPendingOrThrow(orgId, requestId);

    const existingMember = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: request.userId },
    });
    if (!existingMember) {
      const member = this.memberRepo.create({
        organizationId: orgId,
        userId: request.userId,
        role: 'EMPLOYEE',
        invitedBy: approverId,
        joinedAt: new Date(),
      });
      await this.memberRepo.save(member);
    }

    await this.organizationsService.addUserToDefaultChat(orgId, request.userId);

    request.status = 'APPROVED';
    request.respondedBy = approverId;
    request.respondedAt = new Date();
    const saved = await this.joinRequestRepo.save(request);

    const org = await this.organizationRepo.findOne({ where: { id: orgId } });
    await this.notifications.create(
      request.userId,
      WS_EVENTS.JOIN_REQUEST_APPROVED,
      'Заявка одобрена',
      `Вы приняты в организацию «${org?.name ?? ''}»`,
      { organizationId: orgId, requestId: saved.id },
    );

    return saved;
  }

  async reject(orgId: string, requestId: string, approverId: string): Promise<JoinRequest> {
    await this.assertApprover(orgId, approverId);
    const request = await this.findPendingOrThrow(orgId, requestId);

    request.status = 'REJECTED';
    request.respondedBy = approverId;
    request.respondedAt = new Date();
    const saved = await this.joinRequestRepo.save(request);

    const org = await this.organizationRepo.findOne({ where: { id: orgId } });
    await this.notifications.create(
      request.userId,
      WS_EVENTS.JOIN_REQUEST_REJECTED,
      'Заявка отклонена',
      `Ваш запрос на вступление в «${org?.name ?? ''}» был отклонён`,
      { organizationId: orgId, requestId: saved.id },
    );

    return saved;
  }

  private async findPendingOrThrow(orgId: string, requestId: string): Promise<JoinRequest> {
    const request = await this.joinRequestRepo.findOne({
      where: { id: requestId, organizationId: orgId },
      relations: ['user'],
    });
    if (!request) throw new NotFoundException('Join request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Join request has already been processed');
    }
    return request;
  }

  private async assertApprover(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!member || !APPROVAL_ROLES.has(member.role)) {
      throw new ForbiddenException('Only owners and admins can manage join requests');
    }
  }

  private async notifyApprovers(orgId: string, request: JoinRequest, orgName: string): Promise<void> {
    const approvers = await this.memberRepo.find({
      where: { organizationId: orgId },
    });
    const approverIds = approvers
      .filter((m) => APPROVAL_ROLES.has(m.role))
      .map((m) => m.userId);

    await Promise.all(
      approverIds.map((approverId) =>
        this.notifications.create(
          approverId,
          WS_EVENTS.JOIN_REQUEST_NEW,
          'Новая заявка на вступление',
          `Запрос на вступление в «${orgName}»`,
          { organizationId: orgId, requestId: request.id, userId: request.userId },
        ),
      ),
    );
  }
}
