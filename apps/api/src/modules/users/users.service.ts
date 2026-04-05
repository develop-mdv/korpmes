import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.position !== undefined) user.position = dto.position;

    return this.usersRepository.save(user);
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

  async search(query: string, orgId: string): Promise<User[]> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.avatarUrl',
        'user.status',
        'user.position',
      ])
      .where(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query)',
        { query: `%${query}%` },
      );

    if (orgId) {
      qb.innerJoin(
        'organization_members',
        'om',
        'om.user_id = user.id AND om.organization_id = :orgId',
        { orgId },
      );
    }

    return qb.limit(20).getMany();
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
