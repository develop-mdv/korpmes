import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AUDIT_ACTIONS } from '@corp/shared-constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { ChatsService } from '../chats/chats.service';
import { AuditService } from '../audit/audit.service';
import { EditMessageDto } from './dto/edit-message.dto';
import { ReactionDto } from './dto/reaction.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('chats/:chatId/messages')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    await this.chatsService.assertMember(chatId, user.id);
    return this.messagesService.findByChatId(chatId, cursor, limit);
  }

  @Get('chats/:chatId/messages/pinned')
  async getPinnedMessages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @CurrentUser() user: any,
  ) {
    await this.chatsService.assertMember(chatId, user.id);
    return this.messagesService.getPinnedMessages(chatId);
  }

  @Get('messages/:id')
  async getMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const message = await this.messagesService.findById(id);
    await this.chatsService.assertMember(message.chatId, user.id);
    return message;
  }

  @Patch('messages/:id')
  async editMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: EditMessageDto,
  ) {
    return this.messagesService.edit(id, user.id, dto);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const message = await this.messagesService.findById(id).catch(() => null);
    const chat = message?.chatId
      ? await this.chatsService.findById(message.chatId).catch(() => null)
      : null;
    const result = await this.messagesService.remove(id, user.id);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: chat?.organizationId,
      action: AUDIT_ACTIONS.MESSAGE_DELETE,
      entityType: 'message',
      entityId: id,
      metadata: { chatId: message?.chatId },
    });
    return result;
  }

  @Post('messages/:id/reactions')
  async addReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ReactionDto,
  ) {
    const message = await this.messagesService.findById(id);
    await this.chatsService.assertMember(message.chatId, user.id);
    return this.messagesService.addReaction(id, user.id, dto.emoji);
  }

  @Delete('messages/:id/reactions/:emoji')
  async removeReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Param('emoji') emoji: string,
  ) {
    const message = await this.messagesService.findById(id);
    await this.chatsService.assertMember(message.chatId, user.id);
    return this.messagesService.removeReaction(id, user.id, emoji);
  }

  @Get('messages/:id/thread')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getThread(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const parent = await this.messagesService.findById(id);
    await this.chatsService.assertMember(parent.chatId, user.id);
    return this.messagesService.getThreadReplies(id, cursor, limit);
  }
}
