import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoRaw, ResizeMode } from 'expo-av';
import ImageView from 'react-native-image-viewing';

const Video = VideoRaw as unknown as React.ComponentType<any>;
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface MediaItem {
  id: string;
  mimeType: string;
  signedUrl: string;
  thumbnailUrl?: string;
  originalName: string;
}

interface Props {
  items: MediaItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

async function downloadAndShare(item: MediaItem) {
  try {
    const target = `${FileSystem.cacheDirectory}${item.id}-${item.originalName.replace(/[^\w.\-]+/g, '_')}`;
    const result = await FileSystem.downloadAsync(item.signedUrl, target);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri);
    } else {
      Alert.alert('Готово', `Файл сохранён: ${result.uri}`);
    }
  } catch (err: any) {
    Alert.alert('Ошибка', `Не удалось скачать: ${err?.message || err}`);
  }
}

export function FullscreenMediaViewer({ items, index, onIndexChange, onClose }: Props) {
  const allImages = useMemo(() => items.every((it) => it.mimeType.startsWith('image/')), [items]);

  if (allImages) {
    return (
      <ImageView
        images={items.map((it) => ({ uri: it.thumbnailUrl || it.signedUrl }))}
        imageIndex={index}
        visible
        onRequestClose={onClose}
        onImageIndexChange={onIndexChange}
        FooterComponent={({ imageIndex }: { imageIndex: number }) => (
          <View style={styles.footerBar}>
            <Text style={styles.footerText}>
              {imageIndex + 1} / {items.length}
            </Text>
            <Pressable style={styles.footerBtn} onPress={() => downloadAndShare(items[imageIndex])}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.footerBtnText}>Скачать</Text>
            </Pressable>
          </View>
        )}
      />
    );
  }

  const { width } = Dimensions.get('window');
  const current = items[Math.min(index, items.length - 1)];

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {current?.originalName ?? ''}
          </Text>
          <Pressable
            onPress={() => current && downloadAndShare(current)}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Ionicons name="download-outline" size={24} color="#fff" />
          </Pressable>
        </View>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== index) onIndexChange(i);
          }}
          renderItem={({ item, index: i }) => (
            <View style={[styles.slide, { width }]}>
              {item.mimeType.startsWith('video/') ? (
                <Video
                  source={{ uri: item.signedUrl }}
                  posterSource={item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined}
                  usePoster={!!item.thumbnailUrl}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={i === index}
                  style={styles.video}
                />
              ) : (
                <ImageView
                  images={[{ uri: item.signedUrl }]}
                  imageIndex={0}
                  visible={i === index}
                  onRequestClose={onClose}
                  presentationStyle="overFullScreen"
                />
              )}
            </View>
          )}
        />
        <View style={styles.bottomBar}>
          <Text style={styles.footerText}>
            {Math.min(index, items.length - 1) + 1} / {items.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 10,
    gap: 12,
  },
  title: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  iconBtn: { padding: 4 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  bottomBar: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  footerText: { color: '#fff', fontSize: 13 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
  },
  footerBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
