import { useState, useCallback } from 'react';
import { uploadFile as uploadFileApi, type FileInfo } from '@/api/files.api';

export function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, orgId: string, messageId?: string): Promise<FileInfo | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const result = await uploadFileApi(file, orgId, messageId, setProgress);
        setIsUploading(false);
        setProgress(100);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        setIsUploading(false);
        return null;
      }
    },
    [],
  );

  return { upload, progress, isUploading, error };
}
