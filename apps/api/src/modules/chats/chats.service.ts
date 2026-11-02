import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan, Not } from 'typeorm';
import { Chat, ChatType } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { Message } from '../messages/entities/message.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { isSelfChat } from './chats.utils';
import { WorkspaceAccessService } from '../../common/workspace/workspace-access.service';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly chatMemberRepo: Repository<ChatMember>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async create(userId: string, dto: CreateChatDto): Promise<Chat> {
    const orgId = dto.organizationId ?? null;
    if (orgId) await this.workspaceAccess.assertOrganizationMember(orgId, userId);
    if (!orgId && dto.type !== ChatType.PERSONAL && dto.type !== ChatType.GROUP) {
      throw new BadRequestException('Personal spaces support direct and group chats');
    }
    if (dto.type !== ChatType.PERSONAL && !dto.name?.trim()) {
      throw new BadRequestException('Chat name is required');
    }
    await this.workspaceAccess.assertParticipants([userId, ...dto.memberIds], orgId);
    return this.chatRepo.manager.transaction(async (manager) => {
      // Serialise direct/self-chat creation per scope to avoid duplicates from two devices.
      if (dto.type === ChatType.PERSONAL) {
        const ids = [...new Set([userId, ...dto.memberIds])].sort();
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [JSON.stringify([orgId, ids])]);
      }
      const scoped = new ChatsService(manager.getRepository(Chat), manager.getRepository(ChatMember), manager.getRepository(Message), this.workspaceAccess);
      return scoped.createInScope(userId, { ...dto, organizationId: orgId });
    });
  }

  private async createInScope(userId: string, dto: CreateChatDto): Promise<Chat> {
    const isSelf =
      dto.type === ChatType.PERSONAL &&
      dto.memberIds.length === 1 &&
      dto.memberIds[0] === userId;

    if (dto.type === ChatType.PERSONAL) {
      if (isSelf) {
        const existingSelf = await this.findSelfChat(userId, dto.organizationId ?? null);
        if (existingSelf) {
          return this.findById(existingSelf.id);
        }
      } else {
        if (dto.memberIds.length !== 1) {
          throw new BadRequestException('Personal chat requires exactly one other member');
        }

        const otherUserId = dto.memberIds[0];
        const existingChat = await this.findPersonalChat(userId, otherUserId, dto.organizationId ?? null);
        if (existingChat) {
          return this.findById(existingChat.id);
        }
      }
    }

    const chat = this.chatRepo.create({
      organizationId: dto.organizationId,
      type: dto.type,
      name: dto.name?.trim(),
      createdBy: userId,
      isPrivate: dto.type === ChatType.PERSONAL || dto.type === ChatType.GROUP,
    });
    const savedChat = await this.chatRepo.save(chat);

    const creatorRole = dto.type === ChatType.PERSONAL ? 'MEMBER' : 'ADMIN';
    const creatorMember = this.chatMemberRepo.create({
      chatId: savedChat.id,
      userId,
      role: creatorRole,
      joinedAt: new Date(),
    });
    await this.chatMemberRepo.save(creatorMember);

    if (!isSelf) {
      const memberEntities = dto.memberIds
        .filter((id) => id !== userId)
        .map((memberId) =>
          this.chatMemberRepo.create({
            chatId: savedChat.id,
            userId: memberId,
            role: 'MEMBER',
            joinedAt: new Date(),
          }),
        );
      if (memberEntities.length > 0) {
        await this.chatMemberRepo.save(memberEntities);
      }
    }

    return this.findById(savedChat.id);
  }

  async findById(id: string): Promise<Chat> {
    const chat = await this.chatRepo.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
    if (!chat) {
      throw new NotFoundException(`Chat with ID "${id}" not found`);
    }
    return chat;
  }

  async findUserChats(
    userId: string,
    orgId: string | null = null,
  ): Promise<Array<Chat & { unreadCount: number }>> {
    if (orgId) await this.workspaceAccess.assertOrganizationMember(orgId, userId);
    await this.ensureSelfChat(userId, orgId);

    const memberships = await this.chatMemberRepo.find({
      where: {
        userId,
        leftAt: IsNull(),
      },
      relations: ['chat'],
    });

    const membershipByChatId = new Map<string, ChatMember>();
    for (const m of memberships) {
      if (m.chat && m.chat.organizationId === orgId) {
        membershipByChatId.set(m.chat.id, m);
      }
    }

    const chatIds = Array.from(membershipByChatId.keys());
    if (chatIds.length === 0) return [];

    // Load chats with members and their user details
    const chats = await this.chatRepo.find({
      where: chatIds.map((id) => ({ id })),
      relations: ['members', 'members.user'],
    });

    const withUnread = await Promise.all(
      chats.map(async (chat) => {
        const membership = membershipByChatId.get(chat.id);
        const unreadCount = await this.countUnreadForMember(chat.id, membership);
        const latest = await this.messageRepo.findOne({ where: { chatId: chat.id }, order: { seq: 'DESC' }, relations: ['sender'] });
        const lastMessage = latest ? {
          content: latest.content || (latest.type === 'VOICE' ? 'Голосовое сообщение' : latest.type === 'VIDEO_NOTE' ? 'Видеосообщение' : 'Вложение'),
          senderName: `${latest.sender.firstName} ${latest.sender.lastName}`.trim(),
          createdAt: latest.createdAt,
        } : undefined;
        return Object.assign(chat, { unreadCount, lastMessage });
      }),
    );

    return withUnread.sort((a, b) => {
      const aSelf = isSelfChat(a, userId);
      const bSelf = isSelfChat(b, userId);
      if (aSelf && !bSelf) return -1;
      if (!aSelf && bSelf) return 1;
      const aTime = a.lastMessageAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.lastMessageAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
    });
  }

  private async countUnreadForMember(
    chatId: string,
    membership?: ChatMember,
  ): Promise<number> {
    if (!membership) return 0;

    if (!membership.lastReadMessageId) {
      return this.messageRepo.count({ where: { chatId, senderId: Not(membership.userId) } });
    }

    const lastRead = await this.messageRepo.findOne({
      where: { id: membership.lastReadMessageId },
      select: ['id', 'createdAt'],
    });
    if (!lastRead) {
      return this.messageRepo.count({ where: { chatId, senderId: Not(membership.userId) } });
    }

    return this.messageRepo.count({
      where: { chatId, senderId: Not(membership.userId), createdAt: MoreThan(lastRead.createdAt) },
    });
  }

  async getUserChatIds(userId: string): Promise<string[]> {
    const memberships = await this.chatMemberRepo.find({
      where: { userId, leftAt: IsNull() },
      select: ['chatId'],
    });
    const accessible = await Promise.all(memberships.map(async (m) => await this.isMember(m.chatId, userId) ? m.chatId : null));
    return accessible.filter((id): id is string => id !== null);
  }

  async update(chatId: string, userId: string, dto: UpdateChatDto): Promise<Chat> {
    const chat = await this.findById(chatId);
    await this.verifyAdmin(chatId, userId);
    await this.chatRepo.update(chatId, dto);
    return this.findById(chatId);
  }

  async remove(chatId: string, userId: string): Promise<void> {
    await this.findById(chatId);
    await this.verifyAdmin(chatId, userId);
    await this.chatRepo.softDelete(chatId);
  }

  async addMember(chatId: string, userId: string, addedBy: string): Promise<ChatMember> {
    const chat = await this.findById(chatId);
    await this.assertMember(chatId, addedBy);
    await this.verifyAdmin(chatId, addedBy);
    if (chat.type === ChatType.PERSONAL) throw new BadRequestException('Cannot add members to a direct chat');
    await this.workspaceAccess.assertParticipants([userId], chat.organizationId);
    return this.saveChatMember(chatId, userId);
  }

  async joinDefaultChat(chatId: string, userId: string): Promise<ChatMember> {
    const chat = await this.findById(chatId);
    if (!chat.organizationId) throw new ForbiddenException('This is not an organization chat');
    const org = await this.chatRepo.manager.getRepository(Organization).findOneBy({ id: chat.organizationId });
    if (org?.settings?.defaultChatId !== chatId) throw new ForbiddenException('This is not the default organization chat');
    await this.workspaceAccess.assertOrganizationMember(chat.organizationId, userId);
    const existing = await this.chatMemberRepo.findOneBy({ chatId, userId, leftAt: IsNull() });
    return existing ?? this.saveChatMember(chatId, userId);
  }

  private async saveChatMember(chatId: string, userId: string): Promise<ChatMember> {
    const existing = await this.chatMemberRepo.findOne({
      where: { chatId, userId },
    });
    if (existing && !existing.leftAt) {
      throw new BadRequestException('User is already a member of this chat');
    }

    if (existing && existing.leftAt) {
      existing.leftAt = null as any;
      existing.joinedAt = new Date();
      return this.chatMemberRepo.save(existing);
    }

    const member = this.chatMemberRepo.create({
      chatId,
      userId,
      role: 'MEMBER',
      joinedAt: new Date(),
    });
    return this.chatMemberRepo.save(member);
  }

  async removeMember(chatId: string, userId: string, removedBy: string): Promise<void> {
    await this.assertMember(chatId, removedBy);
    if (userId !== removedBy) await this.verifyAdmin(chatId, removedBy);
    const member = await this.chatMemberRepo.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this chat');
    }

    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['members'],
    });
    if (chat && isSelfChat(chat, userId)) {
      throw new ForbiddenException('Cannot leave Saved Messages chat');
    }

    member.leftAt = new Date();
    await this.chatMemberRepo.save(member);
  }

  async getMembers(chatId: string): Promise<ChatMember[]> {
    return this.chatMemberRepo.find({
      where: { chatId, leftAt: IsNull() },
      relations: ['user'],
    });
  }

  async updateLastReadMessage(
    chatId: string,
    userId: string,
    messageId: string | null,
  ): Promise<void> {
    await this.assertMember(chatId, userId);
    if (messageId && !await this.messageRepo.findOneBy({ id: messageId, chatId })) {
      throw new BadRequestException('Message does not belong to this chat');
    }
    if (!messageId) {
      // Fallback: treat "mark read" without explicit id as read up to newest.
      const latest = await this.messageRepo.findOne({
        where: { chatId },
        order: { createdAt: 'DESC' },
        select: ['id'],
      });
      if (!latest) return;
      messageId = latest.id;
    }

    await this.chatMemberRepo.update(
      { chatId, userId },
      { lastReadMessageId: messageId },
    );
  }

  async getUnreadCount(chatId: string, userId: string): Promise<number> {
    const member = await this.chatMemberRepo.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    return this.countUnreadForMember(chatId, member ?? undefined);
  }

  private async findPersonalChat(
    userId1: string,
    userId2: string,
    orgId: string | null,
  ): Promise<Chat | null> {
    const qb = this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'm1', 'm1.userId = :userId1 AND m1.leftAt IS NULL', { userId1 })
      .innerJoin('chat.members', 'm2', 'm2.userId = :userId2 AND m2.leftAt IS NULL', { userId2 })
      .where('chat.type = :type', { type: ChatType.PERSONAL })
      .andWhere(orgId ? 'chat.organizationId = :orgId' : 'chat.organizationId IS NULL', { orgId });

    return qb.getOne();
  }

  private async findSelfChat(userId: string, orgId: string | null): Promise<Chat | null> {
    const candidates = await this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'm', 'm.userId = :userId AND m.leftAt IS NULL', { userId })
      .where('chat.type = :type', { type: ChatType.PERSONAL })
      .andWhere(orgId ? 'chat.organizationId = :orgId' : 'chat.organizationId IS NULL', { orgId })
      .andWhere('chat.createdBy = :userId', { userId })
      .leftJoinAndSelect('chat.members', 'allMembers')
      .getMany();

    for (const chat of candidates) {
      if (isSelfChat(chat, userId)) {
        return chat;
      }
    }
    return null;
  }

  async ensureSelfChat(userId: string, orgId: string | null): Promise<Chat> {
    const existing = await this.findSelfChat(userId, orgId);
    if (existing) return existing;
    try {
      return await this.create(userId, {
        type: ChatType.PERSONAL,
        memberIds: [userId],
        organizationId: orgId,
      });
    } catch (e: any) {
      const recovered = await this.findSelfChat(userId, orgId);
      if (recovered) return recovered;
      throw e;
    }
  }

  private async verifyAdmin(chatId: string, userId: string): Promise<void> {
    await this.assertMember(chatId, userId);
    const member = await this.chatMemberRepo.findOne({
      where: { chatId, userId, leftAt: IsNull() },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this chat');
    }
    if (member.role !== 'ADMIN') {
      throw new ForbiddenException('Only chat admins can perform this action');
    }
  }

  async isMember(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.workspaceAccess.assertChatMember(chatId, userId);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  async assertMember(chatId: string, userId: string): Promise<void> {
    const ok = await this.isMember(chatId, userId);
    if (!ok) {
      throw new ForbiddenException('You are not a member of this chat');
    }
  }
}
