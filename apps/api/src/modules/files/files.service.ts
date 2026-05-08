import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
  ALL_ALLOWED_TYPES,
  AUDIT_ACTIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_MEDIA_DURATION_MS,
} from '@corp/shared-constants';
import { File } from './entities/file.entity';
import { Chat } from '../chats/entities/chat.entity';
import { Task } from '../tasks/entities/task.entity';
import { StorageService, type StorageObject } from './storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { MembersService } from '../organizations/members.service';

export type DownloadKind = 'file' | 'thumbnail';

interface DownloadTokenPayload {
  fileId: string;
  kind: DownloadKind;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
  ) {}

  private async assertMember(orgId: string, userId: string): Promise<void> {
    const member = await this.membersService.getMember(orgId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
  }

  private buildPublicUrl(path: string): string {
    const explicit = this.configService.get<string>('APP_PUBLIC_URL');
    if (explicit) {
      return `${explicit.replace(/\/$/, '')}${path}`;
    }
    const appUrl = this.configService.get<string>('APP_URL');
    if (appUrl) {
      return `${appUrl.replace(/\/$/, '')}/api${path}`;
    }
    const port = this.configService.get<string>('APP_PORT', '3000');
    return `http://localhost:${port}/api${path}`;
  }

  private signDownloadToken(payload: DownloadTokenPayload): string {
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  verifyDownloadToken(token: string): DownloadTokenPayload {
    try {
      const decoded = this.jwtService.verify<DownloadTokenPayload>(token);
      if (!decoded?.fileId || (decoded.kind !== 'file' && decoded.kind !== 'thumbnail')) {
        throw new Error('invalid payload');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid or expired download token');
    }
  }

  async openFileStream(id: string, kind: DownloadKind): Promise<{
    object: StorageObject;
    filename: string;
  }> {
    const file = await this.findById(id);
    const key = kind === 'thumbnail' ? file.thumbnailKey : file.storageKey;
    if (!key) {
      throw new NotFoundException('Requested file content is not available');
    }
    const object = await this.storageService.getObject(key);
    return { object, filename: file.originalName };
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
    orgId: string,
    messageId?: string,
    taskId?: string,
    durationMs?: number,
  ): Promise<File> {
    await this.assertMember(orgId, userId);

    // MediaRecorder produces blobs with codec params (e.g. "video/webm;codecs=vp8,opus");
    // strip them so allowlist matches the canonical type.
    const baseMime = file.mimetype.split(';')[0].trim().toLowerCase();
    if (
      !(ALL_ALLOWED_TYPES as readonly string[]).includes(baseMime)
    ) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes`,
      );
    }

    let validatedDuration: number | null = null;
    if (durationMs !== undefined && durationMs !== null) {
      if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > MAX_MEDIA_DURATION_MS) {
        throw new BadRequestException(
          `Invalid duration: must be between 0 and ${MAX_MEDIA_DURATION_MS} ms`,
        );
      }
      validatedDuration = Math.round(durationMs);
    }

    // Multer decodes the multipart filename header as latin-1; re-encode as
    // utf-8 so cyrillic/etc filenames don't get stored as mojibake.
    const originalName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );

    const fileId = uuidv4();
    // ASCII-only storage key: keep the human filename in the DB column, but
    // strip non-ASCII from the MinIO object key to avoid signed-URL issues.
    const safeKeyName = originalName.replace(/[^\w.\-]+/g, '_');
    const storageKey = `${orgId}/${fileId}/${safeKeyName}`;

    const checksum = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    await this.storageService.upload(storageKey, file.buffer, baseMime);

    let thumbnailKey: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (baseMime.startsWith('image/')) {
      try {
        const metadata = await (sharp as any)(file.buffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;

        const thumbnailBuffer = await (sharp as any)(file.buffer)
          .resize(200, 200, { fit: 'inside' })
          .toBuffer();

        thumbnailKey = `${orgId}/${fileId}/thumbnail_${safeKeyName}`;
        await this.storageService.upload(
          thumbnailKey,
          thumbnailBuffer,
          baseMime,
        );
      } catch (err) {
        this.logger.warn(`Failed to generate thumbnail: ${err}`);
      }
    }

    const entity = this.fileRepository.create({
      uploaderId: userId,
      organizationId: orgId,
      messageId: messageId ?? null,
      taskId: taskId ?? null,
      originalName,
      storageKey,
      mimeType: baseMime,
      sizeBytes: file.size,
      width,
      height,
      thumbnailKey,
      checksum,
      durationMs: validatedDuration,
    });

    const saved = await this.fileRepository.save(entity);

    this.auditService.log({
      userId,
      organizationId: orgId,
      action: AUDIT_ACTIONS.FILE_UPLOAD,
      entityType: 'file',
      entityId: saved.id,
      metadata: { name: originalName, size: file.size, mimeType: baseMime },
    });

    return saved;
  }

  async findById(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException(`File with id "${id}" not found`);
    }
    file.originalName = fixMojibake(file.originalName);
    return file;
  }

  async getDownloadUrl(id: string, userId: string): Promise<string> {
    const file = await this.findById(id);
    await this.assertMember(file.organizationId, userId);
    const token = this.signDownloadToken({ fileId: file.id, kind: 'file' });

    this.auditService.log({
      userId,
      organizationId: file.organizationId,
      action: AUDIT_ACTIONS.FILE_DOWNLOAD,
      entityType: 'file',
      entityId: file.id,
      metadata: { name: file.originalName },
    });

    return this.buildPublicUrl(`/files/${file.id}/raw?token=${token}`);
  }

  async getThumbnailUrl(id: string, userId: string): Promise<string | null> {
    const file = await this.findById(id);
    await this.assertMember(file.organizationId, userId);
    if (!file.thumbnailKey) return null;
    const token = this.signDownloadToken({ fileId: file.id, kind: 'thumbnail' });
    return this.buildPublicUrl(`/files/${file.id}/thumbnail?token=${token}`);
  }

  async delete(id: string, userId: string): Promise<void> {
    const file = await this.findById(id);
    await this.assertMember(file.organizationId, userId);

    if (file.uploaderId !== userId) {
      throw new ForbiddenException('Only the uploader can delete this file');
    }

    await this.storageService.delete(file.storageKey);

    if (file.thumbnailKey) {
      await this.storageService.delete(file.thumbnailKey);
    }

    await this.fileRepository.remove(file);

    this.auditService.log({
      userId,
      organizationId: file.organizationId,
      action: AUDIT_ACTIONS.FILE_DELETE,
      entityType: 'file',
      entityId: file.id,
      metadata: { name: file.originalName },
    });
  }

  async findByChat(chatId: string, userId: string): Promise<File[]> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException(`Chat with id "${chatId}" not found`);
    }
    await this.assertMember(chat.organizationId, userId);

    const rows = await this.fileRepository
      .createQueryBuilder('f')
      .innerJoin('messages', 'm', 'm.id = f.message_id')
      .where('m.chat_id = :chatId', { chatId })
      .orderBy('f.created_at', 'DESC')
      .getMany();
    return rows.map(fixFileNameInPlace);
  }

  async findByTask(taskId: string, userId: string): Promise<File[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id "${taskId}" not found`);
    }
    await this.assertMember(task.organizationId, userId);

    const rows = await this.fileRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(fixFileNameInPlace);
  }

  async findByOrg(orgId: string, userId: string, limit = 100): Promise<File[]> {
    await this.assertMember(orgId, userId);
    const rows = await this.fileRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map(fixFileNameInPlace);
  }
}

// Heuristically reverses the latin-1↔utf-8 mojibake produced by older multer
// uploads. Only applied when the string contains the typical mojibake byte
// pattern (Ð/Ñ/Ã/Â followed by another high-bit byte) AND re-decoding
// produces a valid utf-8 string with no replacement chars.
function fixMojibake(name: string): string {
  if (!name) return name;
  if (!/[ÐÑÃÂ][\x80-\xBF]/.test(name)) return name;
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (decoded.includes('�')) return name;
    return decoded;
  } catch {
    return name;
  }
}

function fixFileNameInPlace(file: File): File {
  file.originalName = fixMojibake(file.originalName);
  return file;
}
