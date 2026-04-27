import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationMember } from './entities/organization-member.entity';
import { Invite } from './entities/invite.entity';
import { Organization } from './entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ROLE_HIERARCHY } from '@corp/shared-constants';
import { INVITE_EXPIRY_HOURS } from '@corp/shared-constants';
import { OrganizationsService } from './organizations.service';

const APPROVAL_ROLES = new Set(['OWNER', 'ADMIN']);

export interface InviteLinkInfo {
  invite: Invite;
  url: string;
}

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getMembers(
    orgId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ data: OrganizationMember[]; total: number }> {
    const [data, total] = await this.memberRepo.findAndCount({
      where: { organizationId: orgId },
      relations: ['user'],
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });
    return { data, total };
  }

  async getMember(orgId: string, userId: string): Promise<OrganizationMember | null> {
    return this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
      relations: ['user'],
    });
  }

  async invite(orgId: string, invitedBy: string, dto: InviteMemberDto): Promise<Invite> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

    const invite = this.inviteRepo.create({
      organizationId: orgId,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      token,
      type: dto.email ? 'EMAIL' : 'PHONE',
      invitedBy,
      status: 'PENDING',
      expiresAt,
    });

    return this.inviteRepo.save(invite);
  }

  async createInviteLink(orgId: string, createdBy: string): Promise<InviteLinkInfo> {
    await this.assertApprover(orgId, createdBy);

    const existing = await this.inviteRepo.findOne({
      where: {
        organizationId: orgId,
        type: 'LINK',
        revokedAt: IsNull(),
      },
    });
    if (existing) {
      return { invite: existing, url: this.buildInviteUrl(existing.token) };
    }

    const invite = this.inviteRepo.create({
      organizationId: orgId,
      email: null as any,
      phone: null as any,
      role: 'EMPLOYEE',
      token: uuidv4(),
      type: 'LINK',
      invitedBy: createdBy,
      status: 'PENDING',
      expiresAt: null,
      revokedAt: null,
    });
    const saved = await this.inviteRepo.save(invite);
    return { invite: saved, url: this.buildInviteUrl(saved.token) };
  }

  async getInviteLink(orgId: string): Promise<InviteLinkInfo | null> {
    const invite = await this.inviteRepo.findOne({
      where: {
        organizationId: orgId,
        type: 'LINK',
        revokedAt: IsNull(),
      },
    });
    if (!invite) return null;
    return { invite, url: this.buildInviteUrl(invite.token) };
  }

  async revokeInviteLink(orgId: string, revokedBy: string): Promise<void> {
    await this.assertApprover(orgId, revokedBy);
    const invite = await this.inviteRepo.findOne({
      where: {
        organizationId: orgId,
        type: 'LINK',
        revokedAt: IsNull(),
      },
    });
    if (!invite) return;
    invite.revokedAt = new Date();
    await this.inviteRepo.save(invite);
  }

  /**
   * Public invite info — no auth required.
   * Returns null if token is invalid, revoked, or expired.
   */
  async getInviteInfo(token: string): Promise<{
    organizationId: string;
    organizationName: string;
    organizationLogo: string | null;
    type: string;
  } | null> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (!invite) return null;
    if (invite.type === 'LINK') {
      if (invite.revokedAt) return null;
    } else {
      if (invite.status !== 'PENDING') return null;
      if (invite.expiresAt && new Date() > invite.expiresAt) return null;
    }

    const org = await this.organizationRepo.findOne({
      where: { id: invite.organizationId },
    });
    if (!org) return null;

    return {
      organizationId: org.id,
      organizationName: org.name,
      organizationLogo: org.logoUrl ?? null,
      type: invite.type,
    };
  }

  async acceptInvite(token: string, userId: string): Promise<OrganizationMember> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.type === 'LINK') {
      if (invite.revokedAt) {
        throw new BadRequestException('Invite link has been revoked');
      }
    } else {
      if (invite.status !== 'PENDING') {
        throw new BadRequestException('Invite has already been used');
      }
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new BadRequestException('Invite has expired');
      }
    }

    const existingMember = await this.memberRepo.findOne({
      where: { organizationId: invite.organizationId, userId },
    });

    let member: OrganizationMember;
    if (existingMember) {
      if (invite.type !== 'LINK') {
        throw new BadRequestException('User is already a member of this organization');
      }
      member = existingMember;
    } else {
      member = this.memberRepo.create({
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
        invitedBy: invite.invitedBy,
        joinedAt: new Date(),
      });
      member = await this.memberRepo.save(member);
    }

    if (invite.type !== 'LINK') {
      invite.status = 'ACCEPTED';
      await this.inviteRepo.save(invite);
    }

    await this.organizationsService.addUserToDefaultChat(invite.organizationId, userId);

    return member;
  }

  async changeRole(
    orgId: string,
    userId: string,
    newRole: string,
    changedBy: string,
  ): Promise<OrganizationMember> {
    const actor = await this.getMember(orgId, changedBy);
    if (!actor) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const target = await this.getMember(orgId, userId);
    if (!target) {
      throw new NotFoundException('Target user is not a member of this organization');
    }

    const actorLevel = ROLE_HIERARCHY[actor.role] ?? 0;
    const targetLevel = ROLE_HIERARCHY[target.role] ?? 0;
    const newRoleLevel = ROLE_HIERARCHY[newRole] ?? 0;

    if (newRoleLevel >= actorLevel) {
      throw new ForbiddenException('Cannot promote a member to a role equal to or above your own');
    }

    if (targetLevel >= actorLevel) {
      throw new ForbiddenException('Cannot change the role of a member with a role equal to or above your own');
    }

    target.role = newRole;
    return this.memberRepo.save(target);
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    const member = await this.getMember(orgId, userId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    await this.memberRepo.remove(member);
  }

  async getUserRole(orgId: string, userId: string): Promise<string | null> {
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    return member ? member.role : null;
  }

  private async assertApprover(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (!member || !APPROVAL_ROLES.has(member.role)) {
      throw new ForbiddenException('Only owners and admins can manage invites');
    }
  }

  private buildInviteUrl(token: string): string {
    const base = process.env.WEB_URL || 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/invite/${token}`;
  }
}
