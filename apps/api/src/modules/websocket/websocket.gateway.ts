import {
  WebSocketGateway as WsGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@corp/shared-constants';
import { MessagesService } from '../messages/messages.service';
import { WebSocketService } from './websocket.service';
import { ChatsService } from '../chats/chats.service';

@WsGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGatewayHandler
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayHandler.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly websocketService: WebSocketService,
    private readonly chatsService: ChatsService,
  ) {}

  afterInit(server: Server): void {
    this.websocketService.setServer(server);
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake?.auth?.token ||
        this.extractTokenFromHeader(client.handshake?.headers?.authorization);

      if (!token) {
        this.logger.warn('Client connected without token, disconnecting');
        client.disconnect();
        return;
      }

      const decoded = await this.jwtService.verifyAsync(token);
      const userId = decoded.sub;

      client.data.userId = userId;
      client.data.userName = decoded.firstName
        ? `${decoded.firstName} ${decoded.lastName || ''}`.trim()
        : decoded.email || 'User';

      // Join personal room
      client.join(`user:${userId}`);

      // Auto-join all user's chat rooms
      try {
        const chatMembers = await this.chatsService.getUserChatIds(userId);
        for (const chatId of chatMembers) {
          client.join(`chat:${chatId}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to load chat rooms for ${userId}: ${err.message}`);
      }

      // Update presence to ONLINE
      await this.websocketService.setUserOnline(userId);

      // Broadcast presence update
      this.server.emit(WS_EVENTS.PRESENCE_UPDATE, {
        userId,
        status: 'ONLINE',
      });

      this.logger.log(`Client connected: ${userId}`);
    } catch (error: any) {
      this.logger.warn(`Authentication failed: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.userId;
    if (!userId) return;

    // Set presence to OFFLINE with a delay (brief disconnect tolerance)
    await this.websocketService.setUserOffline(userId);

    this.server.emit(WS_EVENTS.PRESENCE_UPDATE, {
      userId,
      status: 'OFFLINE',
      lastSeenAt: new Date().toISOString(),
    });

    this.logger.log(`Client disconnected: ${userId}`);
  }

  @SubscribeMessage('chat:join')
  handleChatJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string },
  ): void {
    if (payload.chatId) {
      client.join(`chat:${payload.chatId}`);
    }
  }

  @SubscribeMessage(WS_EVENTS.MESSAGE_SEND)
  async handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      chatId: string;
      content: string;
      type?: string;
      parentMessageId?: string;
      fileIds?: string[];
    },
  ): Promise<void> {
    try {
      const userId = client.data.userId;

      if (!payload.chatId || !payload.content) {
        client.emit(WS_EVENTS.ERROR, { message: 'chatId and content are required' });
        return;
      }

      const message = await this.messagesService.create(payload.chatId, userId, {
        content: payload.content,
        type: payload.type as any,
        parentMessageId: payload.parentMessageId,
        fileIds: payload.fileIds,
      });

      // Emit to chat room (including sender for multi-device)
      this.server.to(`chat:${payload.chatId}`).emit(WS_EVENTS.MESSAGE_NEW, message);
    } catch (error: any) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit(WS_EVENTS.ERROR, { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage(WS_EVENTS.MESSAGE_EDIT)
  async handleMessageEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; content: string },
  ): Promise<void> {
    try {
      const userId = client.data.userId;

      if (!payload.messageId || !payload.content) {
        client.emit(WS_EVENTS.ERROR, { message: 'messageId and content are required' });
        return;
      }

      const message = await this.messagesService.edit(payload.messageId, userId, {
        content: payload.content,
      });

      this.server.to(`chat:${message.chatId}`).emit(WS_EVENTS.MESSAGE_EDIT, {
        messageId: message.id,
        chatId: message.chatId,
        content: message.content,
        editedAt: message.editedAt,
      });
    } catch (error: any) {
      this.logger.error(`Error editing message: ${error.message}`);
      client.emit(WS_EVENTS.ERROR, { message: 'Failed to edit message' });
    }
  }

  @SubscribeMessage(WS_EVENTS.MESSAGE_DELETE)
  async handleMessageDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; chatId: string },
  ): Promise<void> {
    try {
      const userId = client.data.userId;

      if (!payload.messageId || !payload.chatId) {
        client.emit(WS_EVENTS.ERROR, { message: 'messageId and chatId are required' });
        return;
      }

      await this.messagesService.remove(payload.messageId, userId);

      this.server.to(`chat:${payload.chatId}`).emit(WS_EVENTS.MESSAGE_DELETE, {
        messageId: payload.messageId,
        chatId: payload.chatId,
      });
    } catch (error: any) {
      this.logger.error(`Error deleting message: ${error.message}`);
      client.emit(WS_EVENTS.ERROR, { message: 'Failed to delete message' });
    }
  }

  @SubscribeMessage(WS_EVENTS.MESSAGE_READ)
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; messageId: string },
  ): Promise<void> {
    try {
      const userId = client.data.userId;

      if (!payload.chatId || !payload.messageId) {
        client.emit(WS_EVENTS.ERROR, { message: 'chatId and messageId are required' });
        return;
      }

      await this.messagesService.markAsRead(payload.messageId, userId);

      // Emit read receipt to chat room
      this.server.to(`chat:${payload.chatId}`).emit(WS_EVENTS.MESSAGE_READ, {
        chatId: payload.chatId,
        messageId: payload.messageId,
        userId,
      });
    } catch (error: any) {
      this.logger.error(`Error marking message as read: ${error.message}`);
      client.emit(WS_EVENTS.ERROR, { message: 'Failed to mark message as read' });
    }
  }

  @SubscribeMessage(WS_EVENTS.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string },
  ): void {
    if (!payload.chatId) return;

    const userId = client.data.userId;

    // Emit to room excluding sender
    client.to(`chat:${payload.chatId}`).emit(WS_EVENTS.TYPING_START, {
      chatId: payload.chatId,
      userId,
      userName: client.data.userName || 'User',
    });

    // Set typing indicator in Redis with TTL
    this.websocketService.setTypingIndicator(userId, payload.chatId);
  }

  @SubscribeMessage(WS_EVENTS.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string },
  ): void {
    if (!payload.chatId) return;

    const userId = client.data.userId;

    client.to(`chat:${payload.chatId}`).emit(WS_EVENTS.TYPING_STOP, {
      chatId: payload.chatId,
      userId,
      userName: client.data.userName || 'User',
    });

    this.websocketService.clearTypingIndicator(userId, payload.chatId);
  }

  // === WebRTC Call Signaling (relayed via main namespace) ===

  @SubscribeMessage(WS_EVENTS.CALL_OFFER)
  handleCallOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string; sdp: string },
  ): void {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_OFFER, {
      callId: payload.callId,
      fromUserId: client.data.userId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_ANSWER)
  handleCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string; sdp: string },
  ): void {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_ANSWER, {
      callId: payload.callId,
      fromUserId: client.data.userId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_ICE_CANDIDATE)
  handleCallIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string; candidate: any },
  ): void {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
      callId: payload.callId,
      fromUserId: client.data.userId,
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_ACCEPTED)
  handleCallAccepted(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string },
  ): void {
    if (payload.targetUserId) {
      this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_ACCEPTED, {
        callId: payload.callId,
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_HANGUP)
  handleCallHangup(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string },
  ): void {
    if (payload.targetUserId) {
      this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_HANGUP, {
        callId: payload.callId,
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_SCREEN_SHARE)
  handleScreenShare(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string },
  ): void {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_SCREEN_SHARE, {
      callId: payload.callId,
      fromUserId: client.data.userId,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_SCREEN_SHARE_STOP)
  handleScreenShareStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string },
  ): void {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_SCREEN_SHARE_STOP, {
      callId: payload.callId,
      fromUserId: client.data.userId,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_VIDEO_MODE)
  handleVideoMode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string; videoEnabled: boolean },
  ): void {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_VIDEO_MODE, {
      callId: payload.callId,
      fromUserId: client.data.userId,
      videoEnabled: payload.videoEnabled,
    });
  }

  private extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization) return null;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
