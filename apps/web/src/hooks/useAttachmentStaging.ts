import { useCallback, useRef, useState } from 'react';
import {
  MAX_FILE_ATTACHMENTS_PER_MESSAGE,
  MAX_FILE_SIZE_BYTES,
} from '@corp/shared-constants';
import * as filesApi from '@/api/files.api';

export interface StagedFile {
  localId: string;
  file: File;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  fileInfo?: filesApi.FileInfo;
  error?: string;
}

let idCounter = 0;
const nextId = () => `staged-${Date.now()}-${++idCounter}`;

export function useAttachmentStaging(orgId: string | undefined) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const stagedRef = useRef<StagedFile[]>([]);
  stagedRef.current = staged;

  const updateOne = useCallback(
    (localId: string, patch: Partial<StagedFile>) => {
      setStaged((prev) =>
        prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const add = useCallback(
    (files: FileList | File[]) => {
      if (!orgId) return;
      const list = Array.from(files);
      const current = stagedRef.current;
      const capacity = MAX_FILE_ATTACHMENTS_PER_MESSAGE - current.length;
      if (capacity <= 0) return;

      const toAdd = list.slice(0, capacity).map<StagedFile>((file) => {
        const localId = nextId();
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return {
            localId,
            file,
            status: 'error',
            progress: 0,
            error: `File exceeds ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB limit`,
          };
        }
        return { localId, file, status: 'uploading', progress: 0 };
      });

      setStaged((prev) => [...prev, ...toAdd]);

      for (const item of toAdd) {
        if (item.status !== 'uploading') continue;
        filesApi
          .uploadFile(item.file, orgId, undefined, (progress) =>
            updateOne(item.localId, { progress }),
          )
          .then((info) =>
            updateOne(item.localId, {
              status: 'done',
              progress: 100,
              fileInfo: info,
            }),
          )
          .catch((err: Error) =>
            updateOne(item.localId, {
              status: 'error',
              error: err.message || 'Upload failed',
            }),
          );
      }
    },
    [orgId, updateOne],
  );

  const remove = useCallback((localId: string) => {
    setStaged((prev) => prev.filter((s) => s.localId !== localId));
  }, []);

  const reset = useCallback(() => setStaged([]), []);

  const isUploading = staged.some((s) => s.status === 'uploading');
  const hasReady = staged.some((s) => s.status === 'done');
  const getReadyFileIds = useCallback(
    () =>
      stagedRef.current
        .filter((s) => s.status === 'done' && s.fileInfo)
        .map((s) => s.fileInfo!.id),
    [],
  );

  return { staged, add, remove, reset, isUploading, hasReady, getReadyFileIds };
}
