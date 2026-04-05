import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { apiClient } from '../../api/client';

interface FileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('text')
  )
    return 'documents';
  return 'other';
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  images: 'Images',
  documents: 'Docs',
  video: 'Video',
  audio: 'Audio',
  other: 'Other',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export function FilesScreen() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<FileInfo[]>('/files');
      setFiles(data);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filtered =
    activeCategory === 'all'
      ? files
      : files.filter((f) => getCategory(f.mimeType) === activeCategory);

  const handleDownload = useCallback(async (id: string) => {
    try {
      const { data } = await apiClient.get<{ url: string }>(`/files/${id}/download`);
      await Linking.openURL(data.url);
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Category tabs */}
      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeCategory === cat && styles.tabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.originalName}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatSize(item.sizeBytes)} · {item.mimeType.split('/')[1]}
                </Text>
              </View>
              <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(item.id)}>
                <Text style={styles.downloadText}>↓</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.empty}>No files found</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rowInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  fileMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  downloadText: { fontSize: 18, color: '#4F46E5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyContainer: { flex: 1 },
  empty: { fontSize: 14, color: '#9CA3AF' },
});
