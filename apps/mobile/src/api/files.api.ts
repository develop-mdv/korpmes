import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_TOKEN_KEY, apiClient } from './client';

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
  signedUrl?: string;
  thumbnailUrl?: string;
}

export async function uploadFile(params: {
  uri: string;
  name: string;
  mimeType: string;
  orgId: string;
  onProgress?: (progress: number) => void;
}): Promise<FileInfo> {
  const { uri, name, mimeType, orgId } = params;
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const formData = new FormData();
  // React Native FormData accepts `{uri, name, type}` shape that differs from
  // the web DOM FormData typings — cast via `any` to bypass that mismatch.
  (formData as any).append('file', { uri, name, type: mimeType });

  const response = await fetch(
    `${API_BASE_URL}/files/upload?orgId=${encodeURIComponent(orgId)}`,
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
