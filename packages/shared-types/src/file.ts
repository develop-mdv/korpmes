export enum FileCategory {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  ARCHIVE = 'ARCHIVE',
  OTHER = 'OTHER',
}

export interface FileAttachment {
  id: string;
  uploaderId: string;
  organizationId: string;
  messageId?: string;
  taskId?: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  thumbnailKey?: string;
  createdAt: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
}
