import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'uploader_id', type: 'uuid' })
  uploaderId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ name: 'thumbnail_key', type: 'varchar', nullable: true })
  thumbnailKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  checksum: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
