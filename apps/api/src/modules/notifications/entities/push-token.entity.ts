import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('push_tokens')
@Unique(['userId', 'token'])
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  token: string;

  @Column({ type: 'enum', enum: ['web', 'ios', 'android'] })
  platform: 'web' | 'ios' | 'android';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
