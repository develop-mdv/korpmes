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
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get(':orgId/members')
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
  @ApiOperation({ summary: 'Invite a member to the organization' })
  invite(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: any,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.invite(orgId, user.id, dto);
  }

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Accept an organization invite' })
  acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.acceptInvite(token, user.id);
  }

  @Patch(':orgId/members/:userId/role')
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
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membersService.removeMember(orgId, userId);
  }
}
