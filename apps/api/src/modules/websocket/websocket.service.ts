import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import {
  TYPING_INDICATOR_TIMEOUT_MS,
  PRESENCE_OFFLINE_THRESHOLD_MS,
} from '@corp/shared-constants';

@Injectable()
export class WebSocketService {
  private server: Server;
  private readonly logger = new Logger(WebSocketService.name);

  private static readonly PRESENCE_PREFIX = 'presence:';
  private static readonly TYPING_PREFIX = 'typing:';

  constructor(private readonly redisService: RedisService) {}

  setServer(server: Server): void {
    this.server = server;
  }

  emitToChat(chatId: string, event: string, data: any): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }
    this.server.to(`chat:${chatId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToAll(event: string, data: any): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }
    this.server.emit(event, data);
  }

  async setUserOnline(userId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.set(
        `${WebSocketService.PRESENCE_PREFIX}${userId}`,
        'ONLINE',
      );
    } catch (error: any) {
      this.logger.error(`Failed to set user online: ${error.message}`);
    }
  }

  async setUserOffline(userId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      // Set OFFLINE with a TTL to tolerate brief disconnects
      const ttlSeconds = Math.ceil(PRESENCE_OFFLINE_THRESHOLD_MS / 1000);
      await client.set(
        `${WebSocketService.PRESENCE_PREFIX}${userId}`,
        'OFFLINE',
        'EX',
        ttlSeconds,
      );
    } catch (error: any) {
      this.logger.error(`Failed to set user offline: ${error.message}`);
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const client = this.redisService.getClient();
      const status = await client.get(
        `${WebSocketService.PRESENCE_PREFIX}${userId}`,
      );
      return status === 'ONLINE';
    } catch (error: any) {
      this.logger.error(`Failed to check user online status: ${error.message}`);
      return false;
    }
  }

  async getOnlineUsers(): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`${WebSocketService.PRESENCE_PREFIX}*`);
      const onlineUsers: string[] = [];

      for (const key of keys) {
        const status = await client.get(key);
        if (status === 'ONLINE') {
          onlineUsers.push(key.replace(WebSocketService.PRESENCE_PREFIX, ''));
        }
      }

      return onlineUsers;
    } catch (error: any) {
      this.logger.error(`Failed to get online users: ${error.message}`);
      return [];
    }
  }

  async setTypingIndicator(userId: string, chatId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const ttlSeconds = Math.ceil(TYPING_INDICATOR_TIMEOUT_MS / 1000);
      await client.set(
        `${WebSocketService.TYPING_PREFIX}${chatId}:${userId}`,
        '1',
        'EX',
        ttlSeconds,
      );
    } catch (error: any) {
      this.logger.error(`Failed to set typing indicator: ${error.message}`);
    }
  }

  async clearTypingIndicator(userId: string, chatId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.del(
        `${WebSocketService.TYPING_PREFIX}${chatId}:${userId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to clear typing indicator: ${error.message}`);
    }
  }
}
