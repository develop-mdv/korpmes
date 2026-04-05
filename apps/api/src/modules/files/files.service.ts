import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { ALL_ALLOWED_TYPES, MAX_FILE_SIZE_BYTES } from '@corp/shared-constants';
import { File } from './entities/file.entity';
import { StorageService } from './storage/storage.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly storageService: StorageService,
  ) {}

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

    const fileId = uuidv4();
    const storageKey = `${orgId}/${fileId}/${file.originalname}`;

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

        thumbnailKey = `${orgId}/${fileId}/thumbnail_${file.originalname}`;
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
      originalName: file.originalname,
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
    return file;
  }

  async getDownloadUrl(id: string, userId: string): Promise<string> {
    const file = await this.findById(id);
    // TODO: verify user is a member of the organization
    return this.storageService.getSignedUrl(file.storageKey);
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
    return this.fileRepository.find({
      where: { messageId: chatId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByTask(taskId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrg(orgId: string, limit = 100): Promise<File[]> {
    return this.fileRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
