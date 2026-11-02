import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { normalizeUsername, USERNAME_DESCRIPTION, USERNAME_PATTERN } from '@corp/shared-constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { WorkspaceAccessService } from '../../common/workspace/workspace-access.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.twoFactorSecret'])
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() }).getOne();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async create(data: Partial<User>): Promise<User> {
    const id = data.id ?? randomUUID();
    const username = data.username === undefined
      ? `user_${BigInt(`0x${id.replace(/-/g, '')}`).toString(36)}`
      : this.validateUsername(data.username);
    const user = this.usersRepository.create({ ...data, id, username });
    return this.saveUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.position !== undefined) user.position = dto.position;
    if (dto.username !== undefined) user.username = this.validateUsername(dto.username);
    if (dto.phone !== undefined) user.phone = dto.phone as string;

    return this.saveUser(user);
  }

  private validateUsername(value: string): string {
    if (typeof value !== 'string') throw new BadRequestException(USERNAME_DESCRIPTION);
    const username = normalizeUsername(value);
    if (!USERNAME_PATTERN.test(username)) throw new BadRequestException(USERNAME_DESCRIPTION);
    return username;
  }

  private async saveUser(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error: any) {
      const detail = error.driverError ?? error;
      if (detail.code === '23505' && detail.constraint === 'uq_users_username') {
        throw new ConflictException('Этот никнейм уже занят. Выберите другой.');
      }
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<User> {
    const user = await this.findById(id);

    user.status = dto.status;
    user.customStatusText = dto.customText ?? (null as any);

    return this.usersRepository.save(user);
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastSeenAt: new Date() });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash });
  }

  async search(query: string, orgId: string | undefined, userId: string): Promise<User[]> {
    query = (query ?? '').trim();
    if (orgId) await this.workspaceAccess.assertOrganizationMember(orgId, userId);
    if (query.length < 2 || query.length > 254) return [];
    const nickname = normalizeUsername(query);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
    const isNickname = USERNAME_PATTERN.test(nickname);
    if (!orgId && !isEmail && !isNickname) return [];
    const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
    const usernameOnly = query.startsWith('@');
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.firstName',
        'user.lastName',
        'user.avatarUrl',
        'user.status',
        'user.position',
      ])
      .where(orgId && !usernameOnly
        ? '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query OR user.username LIKE :usernamePrefix)'
        : isEmail ? 'LOWER(user.email) = LOWER(:query)' : 'user.username LIKE :usernamePrefix',
        { query: orgId ? `%${escapeLike(query)}%` : query, usernamePrefix: `${escapeLike(nickname)}%` },
      ).andWhere('user.id != :userId', { userId });

    if (orgId) {
      qb.innerJoin(
        'organization_members',
        'om',
        'om.user_id = user.id AND om.organization_id = :orgId',
        { orgId },
      );
    }

    return qb.orderBy('CASE WHEN user.username = :exactUsername THEN 0 ELSE 1 END', 'ASC')
      .setParameter('exactUsername', nickname).addOrderBy('user.username', 'ASC').limit(20).getMany();
  }

  async verifyEmail(id: string): Promise<void> {
    await this.usersRepository.update(id, { isEmailVerified: true });
  }

  async setTwoFactorSecret(id: string, secret: string): Promise<void> {
    await this.usersRepository.update(id, { twoFactorSecret: secret });
  }

  async enableTwoFactor(id: string): Promise<void> {
    await this.usersRepository.update(id, { twoFactorEnabled: true });
  }

  async disableTwoFactor(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      twoFactorEnabled: false,
      twoFactorSecret: null as any,
    });
  }
}
