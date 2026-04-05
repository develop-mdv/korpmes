"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_ALLOWED_TYPES = exports.ALLOWED_ARCHIVE_TYPES = exports.ALLOWED_DOCUMENT_TYPES = exports.ALLOWED_AUDIO_TYPES = exports.ALLOWED_VIDEO_TYPES = exports.ALLOWED_IMAGE_TYPES = void 0;
exports.getFileCategory = getFileCategory;
exports.ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];
exports.ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
];
exports.ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
];
exports.ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];
exports.ALLOWED_ARCHIVE_TYPES = [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
];
exports.ALL_ALLOWED_TYPES = [
    ...exports.ALLOWED_IMAGE_TYPES,
    ...exports.ALLOWED_VIDEO_TYPES,
    ...exports.ALLOWED_AUDIO_TYPES,
    ...exports.ALLOWED_DOCUMENT_TYPES,
    ...exports.ALLOWED_ARCHIVE_TYPES,
];
function getFileCategory(mimeType) {
    if (exports.ALLOWED_IMAGE_TYPES.includes(mimeType))
        return 'image';
    if (exports.ALLOWED_VIDEO_TYPES.includes(mimeType))
        return 'video';
    if (exports.ALLOWED_AUDIO_TYPES.includes(mimeType))
        return 'audio';
    if (exports.ALLOWED_DOCUMENT_TYPES.includes(mimeType))
        return 'document';
    if (exports.ALLOWED_ARCHIVE_TYPES.includes(mimeType))
        return 'archive';
    return 'other';
}
//# sourceMappingURL=mime-types.js.map