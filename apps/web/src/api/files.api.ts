import { apiClient } from './client';
import { useAuthStore } from '@/stores/auth.store';

export interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  organizationId: string;
  messageId?: string;
  taskId?: string;
  uploaderId: string;
  thumbnailKey?: string;
  createdAt: string;
}

export function uploadFile(
  file: File,
  orgId: string,
  messageId?: string,
  onProgress?: (progress: number) => void,
): Promise<FileInfo> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams({ orgId });
    if (messageId) params.set('messageId', messageId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/files/upload?${params.toString()}`);

    const token = useAuthStore.getState().accessToken;
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          // Unwrap backend's TransformInterceptor `{ success, data }` envelope.
          const unwrapped =
            parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed
              ? parsed.data
              : parsed;
          resolve(unwrapped);
        } catch (err) {
          reject(new Error('Invalid server response'));
        }
      } else {
        let serverMsg = `status ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.message) serverMsg = body.message;
        } catch {}
        reject(new Error(`Upload failed: ${serverMsg}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed (network)'));
    xhr.send(formData);
  });
}

export function getFileInfo(id: string): Promise<FileInfo> {
  return apiClient.get(`/files/${id}`).then((r) => r.data);
}

export function getDownloadUrl(id: string): Promise<{ url: string }> {
  return apiClient.get(`/files/${id}/download`).then((r) => r.data);
}

export function deleteFile(id: string): Promise<void> {
  return apiClient.delete(`/files/${id}`).then((r) => r.data);
}

export function listFiles(params: { orgId?: string; chatId?: string; taskId?: string }): Promise<FileInfo[]> {
  return apiClient.get('/files', { params }).then((r) => r.data);
}
