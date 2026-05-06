import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AUDIT_ACTIONS } from '@corp/shared-constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MembersService } from './members.service';
import { AuditService } from '../audit/audit.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { OrganizationMember } from './entities/organization-member.entity';

type OrgRoleRaw = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'GUEST';

function normalizeRoleRaw(role: string): OrgRoleRaw {
  const upper = (role ?? '').toUpperCase();
  if (upper === 'OWNER' || upper === 'ADMIN' || upper === 'MANAGER' || upper === 'GUEST') {
    return upper;
  }
  return 'EMPLOYEE';
}

function mapRoleToPublic(role: string): 'owner' | 'admin' | 'member' {
  const upper = (role ?? '').toUpperCase();
  if (upper === 'OWNER') return 'owner';
  if (upper === 'ADMIN') return 'admin';
  return 'member';
}

function normalizeRoleInput(role: string): string {
  const upper = (role ?? '').toUpperCase();
  if (upper === 'MEMBER') return 'EMPLOYEE';
  return upper;
}

function mapMemberToDto(member: OrganizationMember) {
  const user = member.user;
  return {
    id: member.id,
    userId: member.userId,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    avatar: user?.avatarUrl ?? undefined,
    role: mapRoleToPublic(member.role),
    roleRaw: normalizeRoleRaw(member.role),
    department: undefined as string | undefined,
    joinedAt: (member.joinedAt ?? member.createdAt).toISOString(),
  };
}

@ApiTags('Organization Members')
@Controller('organizations')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':orgId/members')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List organization members' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMembers(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const { data, total } = await this.membersService.getMembers(orgId, {
      page: Number(page),
      limit: Number(limit),
    });
    return {
      members: data.map((member) => mapMemberToDto(member)),
      total,
    };
  }

  @Post(':orgId/members/invite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Invite a member to the organization' })
  async invite(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: any,
    @Body() dto: InviteMemberDto,
  ) {
    const invite = await this.membersService.invite(orgId, user.id, dto);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: AUDIT_ACTIONS.MEMBER_INVITE,
      entityType: 'invite',
      entityId: invite.id,
      metadata: { email: dto.email, phone: dto.phone, role: dto.role },
    });
    return invite;
  }

  @Get(':orgId/invite-link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current invite link for organization' })
  getInviteLink(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.membersService.getInviteLink(orgId);
  }

  @Post(':orgId/invite-link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create or fetch a reusable invite link (OWNER/ADMIN only)' })
  createInviteLink(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.createInviteLink(orgId, user.id);
  }

  @Delete(':orgId/invite-link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke active invite link (OWNER/ADMIN only)' })
  revokeInviteLink(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.revokeInviteLink(orgId, user.id);
  }

  @Get('invites/:token/info')
  @ApiOperation({ summary: 'Public invite info (no auth required)' })
  getInviteInfo(@Param('token') token: string) {
    return this.membersService.getInviteInfo(token);
  }

  @Post('invites/:token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Accept an organization invite' })
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: any,
  ) {
    const member = await this.membersService.acceptInvite(token, user.id);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: member.organizationId,
      action: AUDIT_ACTIONS.MEMBER_ACCEPT_INVITE,
      entityType: 'member',
      entityId: member.id,
      metadata: { role: member.role },
    });
    return member;
  }

  @Patch(':orgId/members/:userId/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Change a member's role" })
  async changeRole(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: string,
    @CurrentUser() user: any,
  ) {
    const previous = await this.membersService.getMember(orgId, userId);
    const updated = await this.membersService.changeRole(
      orgId,
      userId,
      normalizeRoleInput(role),
      user.id,
    );
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: AUDIT_ACTIONS.MEMBER_ROLE_CHANGE,
      entityType: 'member',
      entityId: userId,
      metadata: { from: previous?.role ?? null, to: updated.role },
    });
    return updated;
  }

  @Delete(':orgId/members/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    const member = await this.membersService.getMember(orgId, userId);
    await this.membersService.removeMember(orgId, userId);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: AUDIT_ACTIONS.MEMBER_REMOVE,
      entityType: 'member',
      entityId: userId,
      metadata: { role: member?.role ?? null, email: member?.user?.email ?? null },
    });
  }
}
