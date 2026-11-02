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
import { ChatsService } from './chats.service';
import { AuditService } from '../audit/audit.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { WebSocketService } from '../websocket/websocket.service';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly auditService: AuditService,
    private readonly wsService: WebSocketService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  async create(@CurrentUser() user: any, @Body() dto: CreateChatDto) {
    const chat = await this.chatsService.create(user.id, dto);
    for (const member of chat.members.filter((member) => !member.leftAt)) {
      this.wsService.joinUserToChat(member.userId, chat.id);
      this.wsService.emitToUser(member.userId, 'chat:created', chat);
    }
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: chat.organizationId,
      action: AUDIT_ACTIONS.CHAT_CREATE,
      entityType: 'chat',
      entityId: chat.id,
      metadata: { name: chat.name, type: chat.type },
    });
    return chat;
  }

  @Get()
  @ApiOperation({ summary: "List current user's chats" })
  @ApiQuery({ name: 'orgId', required: false, type: String, description: 'Omit for personal space' })
  findAll(
    @CurrentUser() user: any,
    @Query('orgId', new ParseUUIDPipe({ optional: true })) orgId?: string,
  ) {
    return this.chatsService.findUserChats(user.id, orgId ?? null);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    await this.chatsService.assertMember(id, user.id);
    return this.chatsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateChatDto,
  ) {
    const updated = await this.chatsService.update(id, user.id, dto);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: updated.organizationId,
      action: AUDIT_ACTIONS.CHAT_UPDATE,
      entityType: 'chat',
      entityId: id,
      metadata: { changes: dto as Record<string, unknown> },
    });
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete chat' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const chat = await this.chatsService.findById(id).catch(() => null);
    const result = await this.chatsService.remove(id, user.id);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: chat?.organizationId,
      action: AUDIT_ACTIONS.CHAT_DELETE,
      entityType: 'chat',
      entityId: id,
      metadata: { name: chat?.name },
    });
    return result;
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the chat' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.chatsService.addMember(id, userId, user.id);
    const chat = await this.chatsService.findById(id).catch(() => null);
    if (chat) {
      this.wsService.joinUserToChat(userId, id);
      this.wsService.emitToUser(userId, 'chat:created', chat);
    }
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: chat?.organizationId,
      action: AUDIT_ACTIONS.CHAT_MEMBER_ADD,
      entityType: 'chat',
      entityId: id,
      metadata: { addedUserId: userId },
    });
    return result;
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the chat' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    const chat = await this.chatsService.findById(id).catch(() => null);
    const result = await this.chatsService.removeMember(id, userId, user.id);
    this.wsService.leaveUserChats(userId, [id]);
    this.wsService.emitToUser(userId, 'chat:removed', { chatId: id });
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: chat?.organizationId,
      action: AUDIT_ACTIONS.CHAT_MEMBER_REMOVE,
      entityType: 'chat',
      entityId: id,
      metadata: { removedUserId: userId },
    });
    return result;
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get chat members' })
  async getMembers(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    await this.chatsService.assertMember(id, user.id);
    return this.chatsService.getMembers(id);
  }

  @Post(':id/read')
  @ApiOperation({
    summary: 'Mark chat as read up to the given message (or the latest message if omitted)',
  })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() body: { messageId?: string } = {},
  ) {
    await this.chatsService.updateLastReadMessage(id, user.id, body.messageId ?? null);
    return { success: true };
  }
}
