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
    formData.append('organizationId', orgId);
    if (messageId) {
      formData.append('messageId', messageId);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload');

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
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
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
