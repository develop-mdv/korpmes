import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageStatus } from './entities/message-status.entity';
import { Reaction } from './entities/reaction.entity';
import { File } from '../files/entities/file.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatsService } from '../chats/chats.service';
import { NotificationType } from '@corp/shared-types';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageStatus)
    private readonly messageStatusRepository: Repository<MessageStatus>,
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
  ) {}

  async create(
    chatId: string,
    senderId: string,
    dto: CreateMessageDto,
  ): Promise<Message> {
    // Defend against null/undefined slipping into fileIds (e.g. clients that
    // forget to unwrap the upload response and end up sending [undefined]).
    const cleanFileIds = Array.isArray(dto.fileIds)
      ? dto.fileIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )
      : undefined;
    const hasFiles = !!cleanFileIds && cleanFileIds.length > 0;
    const hasContent = typeof dto.content === 'string' && dto.content.trim().length > 0;
    const inferredType = dto.type || (hasFiles && !hasContent ? 'FILE' : 'TEXT');

    const message = this.messageRepository.create({
      chatId,
      senderId,
      content: hasContent ? dto.content! : null,
      type: inferredType,
      parentMessageId: dto.parentMessageId || null,
      metadata: hasFiles ? { fileIds: cleanFileIds } : {},
    });

    const saved = await this.messageRepository.save(message);

    // Link orphan files (uploaded without messageId) to this message
    if (hasFiles) {
      await this.dataSource
        .createQueryBuilder()
        .update(File)
        .set({ messageId: saved.id })
        .where(
          'id IN (:...ids) AND uploader_id = :uid AND message_id IS NULL',
          { ids: cleanFileIds, uid: senderId },
        )
        .execute();
    }

    const full = await this.messageRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['sender'],
    });

    // Fire-and-forget: create notifications for chat members (except sender)
    this.notifyChatMembers(full, senderId).catch(() => undefined);

    return full;
  }

  private async notifyChatMembers(
    message: Message,
    senderId: string,
  ): Promise<void> {
    try {
      const members = await this.chatsService.getMembers(message.chatId);
      const sender = (message as any).sender;
      const senderName =
        sender?.firstName
          ? `${sender.firstName} ${sender.lastName || ''}`.trim()
          : sender?.email || 'New message';

      const fileCount = Array.isArray((message.metadata as any)?.fileIds)
        ? (message.metadata as any).fileIds.length
        : 0;
      const preview = message.content
        ? message.content.slice(0, 200)
        : fileCount > 0
          ? `📎 ${fileCount} ${fileCount === 1 ? 'файл' : 'файлов'}`
          : '';

      await Promise.all(
        members
          .filter((m: any) => m.userId !== senderId)
          .map((m: any) =>
            this.notificationsService.create(
              m.userId,
              NotificationType.NEW_MESSAGE,
              senderName,
              preview,
              {
                chatId: message.chatId,
                messageId: message.id,
              },
            ),
          ),
      );
    } catch {
      // Notifications must never break message send
    }
  }

  async findByChatId(
    chatId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{
    messages: Message[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.chatId = :chatId', { chatId });

    if (cursor) {
      queryBuilder.andWhere('message.seq < :cursor', { cursor });
    }

    queryBuilder.orderBy('message.seq', 'DESC').take(limit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    // Reverse to ASC for client consumption
    rows.reverse();

    const nextCursor = hasMore && rows.length > 0 ? String(rows[0].seq) : null;

    return { messages: rows, nextCursor, hasMore };
  }

  async catchupSince(
    chatId: string,
    afterSeq: string | number,
    limit = 200,
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const rows = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.chatId = :chatId', { chatId })
      .andWhere('message.seq > :afterSeq', { afterSeq: String(afterSeq) })
      .orderBy('message.seq', 'ASC')
      .take(limit + 1)
      .getMany();

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    return { messages: rows, hasMore };
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
    limit = 50,
  ): Promise<{
    messages: Message[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.parentMessageId = :parentMessageId', { parentMessageId });

    if (cursor) {
      queryBuilder.andWhere('message.seq < :cursor', { cursor });
    }

    queryBuilder.orderBy('message.seq', 'DESC').take(limit + 1);

    const rows = await queryBuilder.getMany();
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    rows.reverse();

    const nextCursor = hasMore && rows.length > 0 ? String(rows[0].seq) : null;

    return { messages: rows, nextCursor, hasMore };
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
