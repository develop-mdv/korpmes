import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';

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
  ) {
    return 'documents';
  }
  return 'other';
}

const CATEGORIES: { id: string; label: string; icon: 'apps-outline' | 'image-outline' | 'document-text-outline' | 'film-outline' | 'musical-notes-outline' | 'ellipsis-horizontal-outline' }[] = [
  { id: 'all', label: 'Все', icon: 'apps-outline' },
  { id: 'images', label: 'Изображения', icon: 'image-outline' },
  { id: 'documents', label: 'Документы', icon: 'document-text-outline' },
  { id: 'video', label: 'Видео', icon: 'film-outline' },
  { id: 'audio', label: 'Аудио', icon: 'musical-notes-outline' },
  { id: 'other', label: 'Другое', icon: 'ellipsis-horizontal-outline' },
];

function FileTypeIcon({ mimeType, color }: { mimeType: string; color: string }) {
  if (mimeType.startsWith('image/')) return <Ionicons name="image-outline" size={22} color={color} />;
  if (mimeType.startsWith('video/')) return <Ionicons name="film-outline" size={22} color={color} />;
  if (mimeType.startsWith('audio/')) return <Ionicons name="musical-notes-outline" size={22} color={color} />;
  if (mimeType.includes('pdf')) return <Ionicons name="document-text-outline" size={22} color={color} />;
  return <Ionicons name="document-outline" size={22} color={color} />;
}

export function FilesScreen() {
  const theme = useTheme();
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
    activeCategory === 'all' ? files : files.filter((f) => getCategory(f.mimeType) === activeCategory);

  const handleDownload = useCallback(async (id: string) => {
    try {
      const { data } = await apiClient.get<{ url: string }>(`/files/${id}/download`);
      await Linking.openURL(data.url);
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsScroll, { borderBottomColor: theme.colors.border }]}
        contentContainerStyle={styles.tabs}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setActiveCategory(cat.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={active ? theme.colors.onPrimary : theme.colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: active ? theme.colors.onPrimary : theme.colors.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceSoft }]}>
                <FileTypeIcon mimeType={item.mimeType} color={theme.colors.primary} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.fileName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.originalName}
                </Text>
                <Text style={[styles.fileMeta, { color: theme.colors.textTertiary }]}>
                  {formatSize(item.sizeBytes)} · {item.mimeType.split('/')[1]}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.downloadBtn, { backgroundColor: theme.colors.surfaceSoft }]}
                onPress={() => handleDownload(item.id)}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-download-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Файлов не найдено"
              description="Попробуйте сменить категорию."
              icon={<Ionicons name="folder-outline" size={56} color={theme.colors.primary} />}
            />
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsScroll: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 56 },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600' },
  fileMeta: { fontSize: 12, marginTop: 2 },
  downloadBtn: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyContainer: { flex: 1 },
});
