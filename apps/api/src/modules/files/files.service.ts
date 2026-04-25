import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { ALL_ALLOWED_TYPES, MAX_FILE_SIZE_BYTES } from '@corp/shared-constants';
import { File } from './entities/file.entity';
import { StorageService, type StorageObject } from './storage/storage.service';

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
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
  ): Promise<File> {
    if (
      !(ALL_ALLOWED_TYPES as readonly string[]).includes(file.mimetype)
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

    await this.storageService.upload(storageKey, file.buffer, file.mimetype);

    let thumbnailKey: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (file.mimetype.startsWith('image/')) {
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
          file.mimetype,
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
      mimeType: file.mimetype,
      sizeBytes: file.size,
      width,
      height,
      thumbnailKey,
      checksum,
    });

    return this.fileRepository.save(entity);
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
    // TODO: verify user is a member of the organization
    const token = this.signDownloadToken({ fileId: file.id, kind: 'file' });
    return this.buildPublicUrl(`/files/${file.id}/raw?token=${token}`);
  }

  async getThumbnailUrl(id: string): Promise<string | null> {
    const file = await this.findById(id);
    if (!file.thumbnailKey) return null;
    const token = this.signDownloadToken({ fileId: file.id, kind: 'thumbnail' });
    return this.buildPublicUrl(`/files/${file.id}/thumbnail?token=${token}`);
  }

  async delete(id: string, userId: string): Promise<void> {
    const file = await this.findById(id);

    if (file.uploaderId !== userId) {
      throw new ForbiddenException('Only the uploader can delete this file');
    }

    await this.storageService.delete(file.storageKey);

    if (file.thumbnailKey) {
      await this.storageService.delete(file.thumbnailKey);
    }

    await this.fileRepository.remove(file);
  }

  async findByChat(chatId: string): Promise<File[]> {
    const rows = await this.fileRepository
      .createQueryBuilder('f')
      .innerJoin('messages', 'm', 'm.id = f.message_id')
      .where('m.chat_id = :chatId', { chatId })
      .orderBy('f.created_at', 'DESC')
      .getMany();
    return rows.map(fixFileNameInPlace);
  }

  async findByTask(taskId: string): Promise<File[]> {
    const rows = await this.fileRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(fixFileNameInPlace);
  }

  async findByOrg(orgId: string, limit = 100): Promise<File[]> {
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
