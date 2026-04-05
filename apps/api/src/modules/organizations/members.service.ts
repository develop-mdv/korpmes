import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationMember } from './entities/organization-member.entity';
import { Invite } from './entities/invite.entity';
import { User } from '../users/entities/user.entity';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ROLE_HIERARCHY } from '@corp/shared-constants';
import { INVITE_EXPIRY_HOURS } from '@corp/shared-constants';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
      invitedBy,
      status: 'PENDING',
      expiresAt,
    });

    return this.inviteRepo.save(invite);
  }

  async acceptInvite(token: string, userId: string): Promise<OrganizationMember> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite has already been used');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite has expired');
    }

    const existingMember = await this.memberRepo.findOne({
      where: { organizationId: invite.organizationId, userId },
    });
    if (existingMember) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const member = this.memberRepo.create({
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
      invitedBy: invite.invitedBy,
      joinedAt: new Date(),
    });
    const savedMember = await this.memberRepo.save(member);

    invite.status = 'ACCEPTED';
    await this.inviteRepo.save(invite);

    return savedMember;
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
}
