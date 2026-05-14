import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_TOKEN_KEY, apiClient } from './client';

export type FileDisplayMode = 'media' | 'file';

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
  durationMs?: number;
  displayMode?: FileDisplayMode | null;
  createdAt: string;
  signedUrl?: string;
  thumbnailUrl?: string;
}

export async function uploadFile(params: {
  uri: string;
  name: string;
  mimeType: string;
  orgId: string;
  taskId?: string;
  messageId?: string;
  durationMs?: number;
  displayMode?: FileDisplayMode;
  onProgress?: (progress: number) => void;
}): Promise<FileInfo> {
  const { uri, name, mimeType, orgId, taskId, messageId, durationMs, displayMode } = params;
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const formData = new FormData();
  // React Native FormData accepts `{uri, name, type}` shape that differs from
  // the web DOM FormData typings — cast via `any` to bypass that mismatch.
  (formData as any).append('file', { uri, name, type: mimeType });

  const queryParams = new URLSearchParams({ orgId });
  if (taskId) queryParams.set('taskId', taskId);
  if (messageId) queryParams.set('messageId', messageId);
  if (durationMs !== undefined && Number.isFinite(durationMs)) {
    queryParams.set('durationMs', String(Math.round(durationMs)));
  }
  if (displayMode) {
    queryParams.set('displayMode', displayMode);
  }

  const response = await fetch(
    `${API_BASE_URL}/files/upload?${queryParams.toString()}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData as any,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  // Unwrap backend's TransformInterceptor `{ success, data }` envelope.
  const unwrapped =
    json && typeof json === 'object' && 'success' in json && 'data' in json
      ? json.data
      : json;
  return unwrapped as FileInfo;
}

export async function getFileInfo(id: string): Promise<FileInfo> {
  const { data } = await apiClient.get<FileInfo>(`/files/${id}`);
  return data;
}

export async function getDownloadUrl(id: string): Promise<{ url: string }> {
  const { data } = await apiClient.get<{ url: string }>(`/files/${id}/download`);
  return data;
}
