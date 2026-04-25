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
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { WebSocketService } from '../websocket/websocket.service';
import { ChatsService } from '../chats/chats.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { NotificationType } from '@corp/shared-types';

@ApiTags('Calls')
@Controller('calls')
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly wsService: WebSocketService,
    private readonly chatsService: ChatsService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async initiate(
    @CurrentUser() user: { id: string },
    @Body() dto: InitiateCallDto,
  ) {
    const call = await this.callsService.initiate(user.id, dto);

    const initiator = await this.usersService.findById(user.id).catch(() => null);
    const initiatorName = initiator
      ? `${initiator.firstName} ${initiator.lastName || ''}`.trim()
      : 'Incoming call';

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

        this.notificationsService
          .create(
            member.userId,
            NotificationType.CALL_INCOMING,
            initiatorName,
            `${dto.type.toLowerCase()} call`,
            {
              callId: call.id,
              chatId: dto.chatId,
              type: dto.type,
              initiatorId: user.id,
            },
          )
          .catch(() => undefined);
      }
    }

    return call;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('history')
  async getHistory(@Query('chatId') chatId: string) {
    return this.callsService.getHistory(chatId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('history/all')
  async getAllHistory(@CurrentUser() user: { id: string }) {
    return this.callsService.getHistoryForUser(user.id);
  }

  // Public — TURN credentials are not user-specific; no auth needed
  @Get('ice-servers')
  getIceServers() {
    const turnUrl = this.configService.get<string>('TURN_URL');
    const username = this.configService.get<string>('TURN_USERNAME');
    const credential = this.configService.get<string>('TURN_PASSWORD');

    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...(turnUrl ? [{ urls: turnUrl, username, credential }] : []),
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async getCallInfo(@Param('id') id: string) {
    return this.callsService.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

    // Missed call notification for initiator
    const rejecter = await this.usersService.findById(user.id).catch(() => null);
    const rejecterName = rejecter
      ? `${rejecter.firstName} ${rejecter.lastName || ''}`.trim()
      : 'User';

    this.notificationsService
      .create(
        call.initiatedBy,
        NotificationType.CALL_MISSED,
        rejecterName,
        `${call.type.toLowerCase()} call declined`,
        {
          callId: call.id,
          chatId: call.chatId,
          type: call.type,
        },
      )
      .catch(() => undefined);

    return call;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/hangup')
  async hangup(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.callsService.hangup(id, user.id);
  }
}
