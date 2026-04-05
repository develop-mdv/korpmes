import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_members')
@Unique(['chatId', 'userId'])
export class ChatMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ default: 'MEMBER' })
  role: string;

  @Column({ name: 'muted_until', type: 'timestamp', nullable: true })
  mutedUntil: Date;

  @Column({ name: 'last_read_message_id', type: 'uuid', nullable: true })
  lastReadMessageId: string;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date;

  @ManyToOne(() => Chat, (chat) => chat.members)
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
