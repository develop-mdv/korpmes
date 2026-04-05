import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { WebSocketService } from '../websocket/websocket.service';
import { ChatsService } from '../chats/chats.service';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly wsService: WebSocketService,
    private readonly chatsService: ChatsService,
  ) {}

  @Post()
  async initiate(
    @CurrentUser() user: { id: string },
    @Body() dto: InitiateCallDto,
  ) {
    const call = await this.callsService.initiate(user.id, dto);

    // Уведомляем всех участников чата о входящем звонке
    const members = await this.chatsService.getMembers(dto.chatId);
    for (const member of members) {
      if (member.userId !== user.id) {
        this.wsService.emitToUser(member.userId, 'call:initiate', {
          callId: call.id,
          chatId: dto.chatId,
          initiatorId: user.id,
          type: dto.type.toLowerCase(),
          participants: [user.id, member.userId],
        });
      }
    }

    return call;
  }

  @Get('history')
  async getHistory(@Query('chatId') chatId: string) {
    return this.callsService.getHistory(chatId);
  }

  @Get('history/all')
  async getAllHistory(@CurrentUser() user: { id: string }) {
    return this.callsService.getHistoryForUser(user.id);
  }

  @Get(':id')
  async getCallInfo(@Param('id') id: string) {
    return this.callsService.getById(id);
  }

  @Patch(':id/answer')
  async answer(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const call = await this.callsService.answer(id, user.id);

    // Уведомляем звонящего (инициатора) что вызов принят
    this.wsService.emitToUser(call.initiatedBy, 'call:accepted', {
      callId: call.id,
      userId: user.id,
    });

    // Для групповых звонков — уведомляем всех активных участников (кроме нового)
    // чтобы каждый создал PeerConnection с новым участником (mesh P2P)
    for (const participant of call.participants) {
      if (participant.userId !== user.id && participant.userId !== call.initiatedBy) {
        this.wsService.emitToUser(participant.userId, 'call:participant-joined', {
          callId: call.id,
          userId: user.id,
        });
      }
    }

    return call;
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const call = await this.callsService.reject(id, user.id);

    // Уведомляем звонящего что вызов отклонён
    this.wsService.emitToUser(call.initiatedBy, 'call:hangup', {
      callId: call.id,
      userId: user.id,
    });

    return call;
  }

  @Patch(':id/hangup')
  async hangup(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.callsService.hangup(id, user.id);
  }
}
