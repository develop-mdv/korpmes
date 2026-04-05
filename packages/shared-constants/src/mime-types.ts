export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

export const ALLOWED_ARCHIVE_TYPES = [
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
] as const;

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_ARCHIVE_TYPES,
] as const;

export function getFileCategory(
  mimeType: string,
): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other' {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) return 'image';
  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)) return 'video';
  if ((ALLOWED_AUDIO_TYPES as readonly string[]).includes(mimeType)) return 'audio';
  if ((ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType)) return 'document';
  if ((ALLOWED_ARCHIVE_TYPES as readonly string[]).includes(mimeType)) return 'archive';
  return 'other';
}
