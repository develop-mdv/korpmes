import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  getClient(): Redis {
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async setUserPresence(userId: string, status: string): Promise<void> {
    await this.set(`presence:${userId}`, status, 300); // 5 minutes TTL
  }

  async getUserPresence(userId: string): Promise<string | null> {
    return this.get(`presence:${userId}`);
  }

  async setTyping(chatId: string, userId: string): Promise<void> {
    await this.set(`typing:${chatId}:${userId}`, '1', 3); // 3 seconds TTL
  }

  async getTypingUsers(chatId: string): Promise<string[]> {
    const pattern = `typing:${chatId}:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys.map((key) => {
      const parts = key.split(':');
      return parts[parts.length - 1];
    });
  }

  async increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }
}
