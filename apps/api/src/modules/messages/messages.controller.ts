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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { EditMessageDto } from './dto/edit-message.dto';
import { ReactionDto } from './dto/reaction.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('chats/:chatId/messages')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.messagesService.findByChatId(chatId, cursor, limit);
  }

  @Get('chats/:chatId/messages/pinned')
  async getPinnedMessages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
  ) {
    return this.messagesService.getPinnedMessages(chatId);
  }

  @Get('messages/:id')
  async getMessage(@Param('id', ParseUUIDPipe) id: string) {
    return this.messagesService.findById(id);
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
    return this.messagesService.remove(id, user.id);
  }

  @Post('messages/:id/reactions')
  async addReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ReactionDto,
  ) {
    return this.messagesService.addReaction(id, user.id, dto.emoji);
  }

  @Delete('messages/:id/reactions/:emoji')
  async removeReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Param('emoji') emoji: string,
  ) {
    return this.messagesService.removeReaction(id, user.id, emoji);
  }

  @Get('messages/:id/thread')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getThread(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.messagesService.getThreadReplies(id, cursor, limit);
  }
}
