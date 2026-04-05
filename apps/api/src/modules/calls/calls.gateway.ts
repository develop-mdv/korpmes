import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@corp/shared-constants';
import { CallsService } from './calls.service';

@WebSocketGateway({ namespace: '/calls', cors: { origin: '*' } })
export class CallsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  constructor(
    private readonly callsService: CallsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake?.auth?.token ||
        this.extractTokenFromHeader(client.handshake?.headers?.authorization);

      if (!token) {
        this.logger.warn('Calls client connected without token, disconnecting');
        client.disconnect();
        return;
      }

      const decoded = await this.jwtService.verifyAsync(token);
      client.data.userId = decoded.sub;
      client.join(`user:${decoded.sub}`);
      this.logger.log(`Calls client connected: ${decoded.sub}`);
    } catch (error: any) {
      this.logger.warn(`Calls auth failed: ${error.message}`);
      client.disconnect();
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_OFFER)
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { callId: string; targetUserId: string; sdp: string },
  ) {
    this.server
      .to(`user:${payload.targetUserId}`)
      .emit(WS_EVENTS.CALL_OFFER, {
        callId: payload.callId,
        fromUserId: client.data.userId,
        sdp: payload.sdp,
      });
  }

  @SubscribeMessage(WS_EVENTS.CALL_ANSWER)
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { callId: string; targetUserId: string; sdp: string },
  ) {
    this.server
      .to(`user:${payload.targetUserId}`)
      .emit(WS_EVENTS.CALL_ANSWER, {
        callId: payload.callId,
        fromUserId: client.data.userId,
        sdp: payload.sdp,
      });
  }

  @SubscribeMessage(WS_EVENTS.CALL_ICE_CANDIDATE)
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { callId: string; targetUserId: string; candidate: any },
  ) {
    this.server
      .to(`user:${payload.targetUserId}`)
      .emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
        callId: payload.callId,
        fromUserId: client.data.userId,
        candidate: payload.candidate,
      });
  }

  @SubscribeMessage(WS_EVENTS.CALL_SCREEN_SHARE)
  handleScreenShare(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string },
  ) {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_SCREEN_SHARE, {
      callId: payload.callId,
      fromUserId: client.data.userId,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_SCREEN_SHARE_STOP)
  handleScreenShareStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; targetUserId: string },
  ) {
    this.server.to(`user:${payload.targetUserId}`).emit(WS_EVENTS.CALL_SCREEN_SHARE_STOP, {
      callId: payload.callId,
      fromUserId: client.data.userId,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_HANGUP)
  async handleHangup(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string },
  ) {
    const userId = client.data.userId;
    const call = await this.callsService.hangup(payload.callId, userId);

    call.participants.forEach((participant) => {
      if (participant.userId !== userId) {
        this.server
          .to(`user:${participant.userId}`)
          .emit(WS_EVENTS.CALL_HANGUP, {
            callId: payload.callId,
            userId,
          });
      }
    });
  }

  private extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization) return null;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
