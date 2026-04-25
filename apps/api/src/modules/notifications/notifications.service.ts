import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WS_EVENTS } from '@corp/shared-constants';
import { Notification } from './entities/notification.entity';
import { PushToken } from './entities/push-token.entity';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { WebSocketService } from '../websocket/websocket.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
    @Inject(forwardRef(() => WebSocketService))
    private readonly wsService: WebSocketService,
  ) {}

  async create(
    userId: string,
    type: string,
    title: string,
    body?: string,
    data?: Record<string, any>,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      body: body ?? null,
      data: data ?? {},
    });

    const saved = await this.notificationRepository.save(notification);

    // Real-time notification via WebSocket (in-app toast/sound/title flash)
    try {
      this.wsService.emitToUser(userId, WS_EVENTS.NOTIFICATION_NEW, saved);
    } catch (err: any) {
      this.logger.warn(`WS emit failed for user ${userId}: ${err.message}`);
    }

    // Fire-and-forget: send push to all registered devices (mobile background)
    this.sendExpoPushToUser(userId, { title, body, data }).catch((err) =>
      this.logger.warn(`Push send failed for user ${userId}: ${err.message}`),
    );

    return saved;
  }

  async findByUser(
    userId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{ items: Notification[]; total: number }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id "${id}" not found`,
      );
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async registerPushToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<PushToken> {
    const existing = await this.pushTokenRepository.findOne({
      where: { userId, token: dto.token },
    });

    if (existing) {
      existing.platform = dto.platform;
      return this.pushTokenRepository.save(existing);
    }

    const pushToken = this.pushTokenRepository.create({
      userId,
      token: dto.token,
      platform: dto.platform,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async removePushToken(userId: string, token: string): Promise<void> {
    await this.pushTokenRepository.delete({ userId, token });
  }

  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    return this.pushTokenRepository.find({ where: { userId } });
  }

  // ─── Expo Push ──────────────────────────────────────────────────────────────

  async sendExpoPushToUser(
    userId: string,
    payload: { title: string; body?: string; data?: Record<string, unknown> },
  ): Promise<void> {
    const tokens = await this.getUserPushTokens(userId);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    }));

    await this.sendExpoPush(messages);
  }

  private async sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
    // Expo Push API accepts up to 100 messages per request
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          this.logger.warn(
            `Expo Push API returned ${response.status}: ${await response.text()}`,
          );
          return;
        }

        const result = (await response.json()) as {
          data: Array<{ status: string; message?: string; details?: unknown }>;
        };

        for (const ticket of result.data) {
          if (ticket.status === 'error') {
            this.logger.warn(`Expo push ticket error: ${ticket.message}`, ticket.details);
          }
        }
      } catch (err) {
        this.logger.error('Expo Push request failed', err);
      }
    }
  }
}
