import { create } from 'zustand';
import * as filesApi from '../api/files.api';

export interface CachedFile extends filesApi.FileInfo {
  expiresAt?: number;
}

interface FileState {
  filesById: Record<string, CachedFile>;
  inFlight: Record<string, Promise<CachedFile>>;
  fetchFile: (id: string) => Promise<CachedFile>;
}

const TTL_MS = 55 * 60 * 1000;

export const useFileStore = create<FileState>()((set, get) => ({
  filesById: {},
  inFlight: {},

  fetchFile: async (id: string) => {
    const cached = get().filesById[id];
    const now = Date.now();
    if (cached && cached.expiresAt && cached.expiresAt > now) {
      return cached;
    }

    const existingPromise = get().inFlight[id];
    if (existingPromise) return existingPromise;

    const promise = (async () => {
      const info = await filesApi.getFileInfo(id);
      const enriched: CachedFile = { ...info, expiresAt: Date.now() + TTL_MS };
      set((state) => ({
        filesById: { ...state.filesById, [id]: enriched },
        inFlight: Object.fromEntries(
          Object.entries(state.inFlight).filter(([k]) => k !== id),
        ),
      }));
      return enriched;
    })().catch((err) => {
      set((state) => ({
        inFlight: Object.fromEntries(
          Object.entries(state.inFlight).filter(([k]) => k !== id),
        ),
      }));
      throw err;
    });

    set((state) => ({ inFlight: { ...state.inFlight, [id]: promise } }));
    return promise;
  },
}));
