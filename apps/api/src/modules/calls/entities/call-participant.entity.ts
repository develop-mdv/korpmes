import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('call_participants')
@Unique(['callId', 'userId'])
export class CallParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'call_id', type: 'uuid' })
  callId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date | null;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @Column({ name: 'is_video_off', default: false })
  isVideoOff: boolean;

  @ManyToOne(() => Call, (call) => call.participants)
  @JoinColumn({ name: 'call_id' })
  call: Call;
}
