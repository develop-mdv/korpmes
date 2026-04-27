import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const tokens = await this.generateTokens(user);

    const { passwordHash: _, ...safeUser } = user;
    return {
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        return { requiresTwoFactor: true };
      }

      const isCodeValid = authenticator.verify({
        token: dto.twoFactorCode,
        secret: user.twoFactorSecret,
      });

      if (!isCodeValid) {
        throw new UnauthorizedException('Invalid two-factor authentication code');
      }
    }

    const tokens = await this.generateTokens(user);

    const { passwordHash: _, ...safeUser } = user;
    return {
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(token: string) {
    const tokenHash = await bcrypt.hash(token, 10);

    const storedTokens = await this.refreshTokenRepository.find({
      where: {
        revokedAt: IsNull(),
      },
    });

    let storedToken: RefreshToken | null = null;
    for (const st of storedTokens) {
      const isMatch = await bcrypt.compare(token, st.tokenHash);
      if (isMatch) {
        storedToken = st;
        break;
      }
    }

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token
    storedToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    // Find user and generate new tokens
    const user = await this.usersService.findById(storedToken.userId);
    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const storedTokens = await this.refreshTokenRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
      },
    });

    for (const st of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, st.tokenHash);
      if (isMatch) {
        st.revokedAt = new Date();
        await this.refreshTokenRepository.save(st);
        return;
      }
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Hash and store refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return silently to prevent email enumeration
      return;
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    // In production, send email with reset link
    this.logger.log(`Password reset token for user ${user.id}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (payload.type !== 'password-reset') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.usersService.update(user.id, {} as any);
    // Directly update password hash
    await this.usersService
      .findById(user.id)
      .then(() =>
        this.refreshTokenRepository.manager
          .getRepository(User)
          .update(user.id, { passwordHash }),
      );

    // Revoke all refresh tokens
    await this.logoutAll(user.id);
  }

  async setupTwoFactor(userId: string) {
    const user = await this.usersService.findById(userId);

    const secret = authenticator.generateSecret();
    await this.usersService.setTwoFactorSecret(userId, secret);

    const otpauthUrl = authenticator.keyuri(user.email, 'StaffHub', secret);

    return { secret, otpauthUrl };
  }

  async verifyTwoFactor(userId: string, code: string): Promise<void> {
    const user = await this.refreshTokenRepository.manager
      .getRepository(User)
      .findOne({
        where: { id: userId },
        select: ['id', 'twoFactorSecret'],
      });

    if (!user || !user.twoFactorSecret) {
      throw new NotFoundException('Two-factor authentication not set up');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    await this.usersService.enableTwoFactor(userId);
  }

  async disableTwoFactor(userId: string, code: string): Promise<void> {
    const user = await this.refreshTokenRepository.manager
      .getRepository(User)
      .findOne({
        where: { id: userId },
        select: ['id', 'twoFactorSecret'],
      });

    if (!user || !user.twoFactorSecret) {
      throw new NotFoundException('Two-factor authentication not set up');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    await this.usersService.disableTwoFactor(userId);
  }
}
