import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageStatus } from './entities/message-status.entity';
import { Reaction } from './entities/reaction.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageStatus)
    private readonly messageStatusRepository: Repository<MessageStatus>,
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
  ) {}

  async create(
    chatId: string,
    senderId: string,
    dto: CreateMessageDto,
  ): Promise<Message> {
    const message = this.messageRepository.create({
      chatId,
      senderId,
      content: dto.content,
      type: dto.type || 'TEXT',
      parentMessageId: dto.parentMessageId || null,
      metadata: dto.fileIds ? { fileIds: dto.fileIds } : {},
    });

    const saved = await this.messageRepository.save(message);

    return this.messageRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['sender'],
    });
  }

  async findByChatId(
    chatId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.chatId = :chatId', { chatId });

    if (cursor) {
      queryBuilder.andWhere('message.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .take(limit + 1);

    const messages = await queryBuilder.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    const nextCursor =
      hasMore && messages.length > 0
        ? messages[messages.length - 1].createdAt.toISOString()
        : null;

    return { messages, nextCursor, hasMore };
  }

  async findById(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['sender', 'reactions'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async edit(
    id: string,
    userId: string,
    dto: EditMessageDto,
  ): Promise<Message> {
    const message = await this.findById(id);

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = dto.content;
    message.isEdited = true;
    message.editedAt = new Date();

    return this.messageRepository.save(message);
  }

  async remove(id: string, userId: string): Promise<void> {
    const message = await this.findById(id);

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.softDelete(id);
  }

  async pin(id: string): Promise<Message> {
    await this.messageRepository.update(id, { isPinned: true });
    return this.findById(id);
  }

  async unpin(id: string): Promise<Message> {
    await this.messageRepository.update(id, { isPinned: false });
    return this.findById(id);
  }

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<Reaction[]> {
    try {
      const reaction = this.reactionRepository.create({
        messageId,
        userId,
        emoji,
      });
      await this.reactionRepository.save(reaction);
    } catch (error) {
      // Unique constraint violation — reaction already exists, ignore
      if ((error as any)?.code !== '23505') {
        throw error;
      }
    }

    return this.reactionRepository.find({
      where: { messageId },
      relations: ['user'],
    });
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.reactionRepository.delete({ messageId, userId, emoji });
  }

  async getReactions(messageId: string): Promise<Reaction[]> {
    return this.reactionRepository.find({
      where: { messageId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.messageStatusRepository.upsert(
      {
        messageId,
        userId,
        status: 'READ',
      },
      {
        conflictPaths: ['messageId', 'userId'],
      },
    );
  }

  async markChatAsRead(
    chatId: string,
    userId: string,
    lastMessageId: string,
  ): Promise<void> {
    const lastMessage = await this.messageRepository.findOne({
      where: { id: lastMessageId },
    });

    if (!lastMessage) return;

    const messages = await this.messageRepository.find({
      where: {
        chatId,
        createdAt: LessThan(new Date(lastMessage.createdAt.getTime() + 1)),
      },
      select: ['id'],
    });

    if (messages.length === 0) return;

    const statuses = messages.map((msg) => ({
      messageId: msg.id,
      userId,
      status: 'READ',
    }));

    await this.messageStatusRepository.upsert(statuses, {
      conflictPaths: ['messageId', 'userId'],
    });
  }

  async getThreadReplies(
    parentMessageId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.parentMessageId = :parentMessageId', { parentMessageId });

    if (cursor) {
      queryBuilder.andWhere('message.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .take(limit + 1);

    const messages = await queryBuilder.getMany();
    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    const nextCursor =
      hasMore && messages.length > 0
        ? messages[messages.length - 1].createdAt.toISOString()
        : null;

    return { messages, nextCursor, hasMore };
  }

  async getThreadCount(parentMessageId: string): Promise<number> {
    return this.messageRepository.count({
      where: { parentMessageId },
    });
  }

  async getPinnedMessages(chatId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { chatId, isPinned: true },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });
  }
}
