import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Chat, ChatType } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly chatMemberRepo: Repository<ChatMember>,
  ) {}

  async create(userId: string, dto: CreateChatDto): Promise<Chat> {
    if (dto.type === ChatType.PERSONAL) {
      if (dto.memberIds.length !== 1) {
        throw new BadRequestException('Personal chat requires exactly one other member');
      }

      const otherUserId = dto.memberIds[0];
      const existingChat = await this.findPersonalChat(userId, otherUserId, dto.organizationId);
      if (existingChat) {
        return existingChat;
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

  async findUserChats(userId: string, orgId: string): Promise<Chat[]> {
    const memberships = await this.chatMemberRepo.find({
      where: {
        userId,
        leftAt: IsNull(),
      },
      relations: ['chat'],
    });

    const chatIds = memberships
      .map((m) => m.chat)
      .filter((chat) => chat && chat.organizationId === orgId)
      .map((chat) => chat.id);

    if (chatIds.length === 0) return [];

    // Load chats with members and their user details
    const chats = await this.chatRepo.find({
      where: chatIds.map((id) => ({ id })),
      relations: ['members', 'members.user'],
    });

    return chats.sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.lastMessageAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
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
    messageId: string,
  ): Promise<void> {
    await this.chatMemberRepo.update(
      { chatId, userId },
      { lastReadMessageId: messageId },
    );
  }

  async getUnreadCount(chatId: string, userId: string): Promise<number> {
    const member = await this.chatMemberRepo.findOne({
      where: { chatId, userId },
    });
    if (!member || !member.lastReadMessageId) {
      return 0;
    }
    // Unread count would require a messages table query.
    // This is a placeholder that returns 0; the messages module
    // should provide the actual count via a cross-module call.
    return 0;
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
