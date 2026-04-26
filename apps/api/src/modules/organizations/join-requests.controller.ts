import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JoinRequestsService } from './join-requests.service';
import { RequestJoinDto } from './dto/request-join.dto';

@ApiTags('Organization Join Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Post(':id/join-request')
  @ApiOperation({ summary: 'Request to join an organization (creates pending request)' })
  request(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: RequestJoinDto,
  ) {
    return this.joinRequestsService.create(id, user.id, dto.message);
  }

  @Get(':id/join-requests')
  @ApiOperation({ summary: 'List pending join requests (OWNER/ADMIN only)' })
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.joinRequestsService.listPending(id, user.id);
  }

  @Get(':id/join-requests/me')
  @ApiOperation({ summary: 'Get current user pending request for org' })
  myPending(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.joinRequestsService.getMyPending(id, user.id);
  }

  @Get('join-requests/me')
  @ApiOperation({ summary: 'Get all current user pending requests' })
  myAllPending(@CurrentUser() user: any) {
    return this.joinRequestsService.getMyAllPending(user.id);
  }

  @Patch(':id/join-requests/:requestId/approve')
  @ApiOperation({ summary: 'Approve a pending join request' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.joinRequestsService.approve(id, requestId, user.id);
  }

  @Patch(':id/join-requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a pending join request' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.joinRequestsService.reject(id, requestId, user.id);
  }
}
