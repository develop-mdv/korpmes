import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ type: 'varchar', default: 'TEXT' })
  type: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'parent_message_id', type: 'uuid', nullable: true })
  parentMessageId: string | null;

  @Column({ type: 'bigint', generated: 'increment' })
  seq: string;

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt: Date | null;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'search_vector', type: 'tsvector', select: false, nullable: true })
  searchVector: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  // Relations

  @ManyToOne('Chat', 'messages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: any;

  @ManyToOne('User', 'messages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: any;

  @ManyToOne(() => Message, (message) => message.replies, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage: Message | null;

  @OneToMany(() => Message, (message) => message.parentMessage)
  replies: Message[];

  @OneToMany('Reaction', 'message')
  reactions: any[];

  @OneToMany('MessageStatus', 'message')
  messageStatuses: any[];
}
