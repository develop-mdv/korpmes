import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  const now = new Date('2026-05-19T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function createService() {
    const jwtService = {
      sign: jest.fn((_payload, options) =>
        options.secret === 'refresh-secret' ? 'refresh-token' : 'access-token',
      ),
    } as unknown as JwtService;

    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_TTL: '90d',
        };

        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    const refreshTokenRepository = {
      create: jest.fn((entity: Partial<RefreshToken>) => entity as RefreshToken),
      save: jest.fn(async (entity: RefreshToken) => entity),
    } as unknown as Repository<RefreshToken>;

    const service = new AuthService(
      {} as any,
      jwtService,
      configService,
      refreshTokenRepository,
      {} as any,
      {} as any,
    );

    return { service, jwtService, refreshTokenRepository };
  }

  it('stores refresh sessions for the configured 90 day TTL', async () => {
    const { service, jwtService, refreshTokenRepository } = createService();
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    } as User;

    await service.generateTokens(user);

    expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
      secret: 'access-secret',
      expiresIn: '15m',
    });
    expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
      secret: 'refresh-secret',
      expiresIn: '90d',
    });
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: new Date('2026-08-17T00:00:00.000Z'),
      }),
    );
  });
});
