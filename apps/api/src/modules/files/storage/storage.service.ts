export abstract class StorageService {
  abstract upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<void>;

  abstract getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  abstract delete(key: string): Promise<void>;

  abstract exists(key: string): Promise<boolean>;
}
