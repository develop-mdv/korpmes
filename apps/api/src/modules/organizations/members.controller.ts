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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MembersService } from './members.service';
import { InviteMemberDto } from './dto/invite-member.dto';

@ApiTags('Organization Members')
@Controller('organizations')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get(':orgId/members')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List organization members' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMembers(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.membersService.getMembers(orgId, { page, limit });
  }

  @Post(':orgId/members/invite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Invite a member to the organization' })
  invite(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: any,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.invite(orgId, user.id, dto);
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
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.acceptInvite(token, user.id);
  }

  @Patch(':orgId/members/:userId/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Change a member's role" })
  changeRole(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.changeRole(orgId, userId, role, user.id);
  }

  @Delete(':orgId/members/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membersService.removeMember(orgId, userId);
  }
}
