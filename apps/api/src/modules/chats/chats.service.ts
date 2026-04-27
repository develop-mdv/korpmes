import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Chat, ChatType } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { Message } from '../messages/entities/message.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { isSelfChat } from './chats.utils';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly chatMemberRepo: Repository<ChatMember>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async create(userId: string, dto: CreateChatDto): Promise<Chat> {
    const isSelf =
      dto.type === ChatType.PERSONAL &&
      dto.memberIds.length === 1 &&
      dto.memberIds[0] === userId;

    if (dto.type === ChatType.PERSONAL) {
      if (isSelf) {
        const existingSelf = await this.findSelfChat(userId, dto.organizationId);
        if (existingSelf) {
          return existingSelf;
        }
      } else {
        if (dto.memberIds.length !== 1) {
          throw new BadRequestException('Personal chat requires exactly one other member');
        }

        const otherUserId = dto.memberIds[0];
        const existingChat = await this.findPersonalChat(userId, otherUserId, dto.organizationId);
        if (existingChat) {
          return existingChat;
        }
      }
    }

    const chat = this.chatRepo.create({
      organizationId: dto.organizationId,
      type: dto.type,
      name: dto.name,
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
      relations: ['members'],
    });
    if (!chat) {
      throw new NotFoundException(`Chat with ID "${id}" not found`);
    }
    return chat;
  }

  async findUserChats(
    userId: string,
    orgId: string,
  ): Promise<Array<Chat & { unreadCount: number }>> {
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
        return Object.assign(chat, { unreadCount });
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
      return this.messageRepo.count({ where: { chatId } });
    }

    const lastRead = await this.messageRepo.findOne({
      where: { id: membership.lastReadMessageId },
      select: ['id', 'createdAt'],
    });
    if (!lastRead) {
      return this.messageRepo.count({ where: { chatId } });
    }

    return this.messageRepo.count({
      where: { chatId, createdAt: MoreThan(lastRead.createdAt) },
    });
  }

  async getUserChatIds(userId: string): Promise<string[]> {
    const memberships = await this.chatMemberRepo.find({
      where: { userId, leftAt: IsNull() },
      select: ['chatId'],
    });
    return memberships.map((m) => m.chatId);
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
    await this.findById(chatId);
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
    orgId: string,
  ): Promise<Chat | null> {
    const qb = this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'm1', 'm1.userId = :userId1', { userId1 })
      .innerJoin('chat.members', 'm2', 'm2.userId = :userId2', { userId2 })
      .where('chat.type = :type', { type: ChatType.PERSONAL })
      .andWhere('chat.organizationId = :orgId', { orgId });

    return qb.getOne();
  }

  private async findSelfChat(userId: string, orgId: string): Promise<Chat | null> {
    const candidates = await this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'm', 'm.userId = :userId AND m.leftAt IS NULL', { userId })
      .where('chat.type = :type', { type: ChatType.PERSONAL })
      .andWhere('chat.organizationId = :orgId', { orgId })
      .andWhere('chat.createdBy = :userId', { userId })
      .leftJoinAndSelect('chat.members', 'allMembers')
      .getMany();

    for (const chat of candidates) {
      const active = (chat.members ?? []).filter((m) => !m.leftAt);
      if (active.length === 1 && active[0].userId === userId) {
        return chat;
      }
    }
    return null;
  }

  async ensureSelfChat(userId: string, orgId: string): Promise<Chat> {
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
}
