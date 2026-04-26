import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type InviteType = 'EMAIL' | 'PHONE' | 'LINK';

@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 'EMPLOYEE' })
  role: string;

  @Column({ unique: true })
  token: string;

  @Column({ default: 'EMAIL' })
  type: InviteType;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
