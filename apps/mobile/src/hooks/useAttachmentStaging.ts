import { useCallback, useRef, useState } from 'react';
import {
  MAX_FILE_ATTACHMENTS_PER_MESSAGE,
  MAX_FILE_SIZE_BYTES,
} from '@corp/shared-constants';
import * as filesApi from '../api/files.api';

export interface StagedAttachment {
  localId: string;
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  fileInfo?: filesApi.FileInfo;
  error?: string;
}

let idCounter = 0;
const nextId = () => `staged-${Date.now()}-${++idCounter}`;

export interface StagingInput {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export function useAttachmentStaging(orgId: string | undefined) {
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const stagedRef = useRef<StagedAttachment[]>([]);
  stagedRef.current = staged;

  const updateOne = useCallback(
    (localId: string, patch: Partial<StagedAttachment>) => {
      setStaged((prev) =>
        prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const add = useCallback(
    (inputs: StagingInput[]) => {
      if (!orgId || inputs.length === 0) return;
      const current = stagedRef.current;
      const capacity = MAX_FILE_ATTACHMENTS_PER_MESSAGE - current.length;
      if (capacity <= 0) return;

      const toAdd = inputs.slice(0, capacity).map<StagedAttachment>((inp) => {
        const localId = nextId();
        if (inp.sizeBytes > MAX_FILE_SIZE_BYTES) {
          return {
            localId,
            uri: inp.uri,
            name: inp.name,
            mimeType: inp.mimeType,
            sizeBytes: inp.sizeBytes,
            status: 'error',
            progress: 0,
            error: `Exceeds ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB`,
          };
        }
        return {
          localId,
          uri: inp.uri,
          name: inp.name,
          mimeType: inp.mimeType,
          sizeBytes: inp.sizeBytes,
          status: 'uploading',
          progress: 0,
        };
      });

      setStaged((prev) => [...prev, ...toAdd]);

      for (const item of toAdd) {
        if (item.status !== 'uploading') continue;
        filesApi
          .uploadFile({
            uri: item.uri,
            name: item.name,
            mimeType: item.mimeType,
            orgId,
          })
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
