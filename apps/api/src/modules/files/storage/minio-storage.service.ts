import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { StorageService } from './storage.service';

@Injectable()
export class MinioStorageService extends StorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    super();
    const endpoint = this.configService.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    const url = new URL(endpoint);
    this.client = new Minio.Client({
      endPoint: url.hostname,
      port: parseInt(url.port || '9000', 10),
      useSSL: url.protocol === 'https:',
      accessKey: this.configService.get<string>('S3_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('S3_SECRET_KEY', 'minioadmin'),
    });
    this.bucket = this.configService.get<string>('S3_BUCKET', 'corpmessenger');
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (error: any) {
      this.logger.warn(`MinIO initialization failed: ${error.message}. File uploads will not work until MinIO is available.`);
    }
  }

  async upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
      ...metadata,
    });
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expiresIn);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, key);
      return true;
    } catch {
      return false;
    }
  }
}
