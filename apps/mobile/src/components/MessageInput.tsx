import React, { useState, useCallback, memo } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import type { StagedAttachment, StagingInput } from '../hooks/useAttachmentStaging';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore - expo-document-picker is added to package.json but types
// only resolve after `pnpm install` + EAS rebuild
import * as DocumentPicker from 'expo-document-picker';

interface MessageInputProps {
  onSend: (text: string) => void;
  onAttach?: (files: StagingInput[]) => void;
  stagedFiles?: StagedAttachment[];
  onRemoveStaged?: (localId: string) => void;
  disableSend?: boolean;
  placeholder?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function pickImages(): Promise<StagingInput[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a: any) => ({
    uri: a.uri,
    name: a.fileName || `image-${Date.now()}.${String(a.uri).split('.').pop() || 'jpg'}`,
    mimeType: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    sizeBytes: a.fileSize || 0,
  }));
}

async function takePhoto(): Promise<StagingInput[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a: any) => ({
    uri: a.uri,
    name: a.fileName || `photo-${Date.now()}.jpg`,
    mimeType: a.mimeType || 'image/jpeg',
    sizeBytes: a.fileSize || 0,
  }));
}

async function pickDocuments(): Promise<StagingInput[]> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((a: any) => ({
    uri: a.uri,
    name: a.name,
    mimeType: a.mimeType || 'application/octet-stream',
    sizeBytes: a.size || 0,
  }));
}

export const MessageInput = memo(function MessageInput({
  onSend,
  onAttach,
  stagedFiles = [],
  onRemoveStaged,
  disableSend,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const hasReady = stagedFiles.some((s) => s.status === 'done');
  const canSend = !disableSend && (text.trim().length > 0 || hasReady);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }, [text, onSend, canSend]);

  const openAttachMenu = useCallback(() => {
    if (!onAttach) return;
    Alert.alert(
      'Attach',
      undefined,
      [
        {
          text: 'Photo / Video',
          onPress: async () => {
            const files = await pickImages().catch(() => []);
            if (files.length > 0) onAttach(files);
          },
        },
        {
          text: 'Take Photo',
          onPress: async () => {
            const files = await takePhoto().catch(() => []);
            if (files.length > 0) onAttach(files);
          },
        },
        {
          text: 'Document',
          onPress: async () => {
            const files = await pickDocuments().catch(() => []);
            if (files.length > 0) onAttach(files);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [onAttach]);

  return (
    <View>
      {stagedFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={stripStyles.strip}
          contentContainerStyle={stripStyles.stripContent}
        >
          {stagedFiles.map((s) => {
            const isImage = s.mimeType.startsWith('image/');
            return (
              <View key={s.localId} style={stripStyles.item}>
                {isImage ? (
                  <Image source={{ uri: s.uri }} style={stripStyles.thumb} />
                ) : (
                  <View style={stripStyles.fileIcon}>
                    <Text style={stripStyles.fileIconText}>📄</Text>
                  </View>
                )}
                <View style={stripStyles.itemInfo}>
                  <Text numberOfLines={1} style={stripStyles.itemName}>
                    {s.name}
                  </Text>
                  <Text style={stripStyles.itemMeta}>
                    {formatSize(s.sizeBytes)}
                    {s.status === 'uploading' && ` · ${s.progress}%`}
                    {s.status === 'error' && ` · ${s.error}`}
                  </Text>
                </View>
                <Pressable
                  style={stripStyles.removeBtn}
                  onPress={() => onRemoveStaged?.(s.localId)}
                >
                  <Text style={stripStyles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.container}>
        {onAttach && (
          <Pressable style={styles.iconButton} onPress={openAttachMenu}>
            <Text style={styles.iconText}>+</Text>
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={4000}
        />
        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>
            Send
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  iconText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111827',
  },
  sendButton: {
    marginLeft: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sendTextDisabled: {
    color: '#9CA3AF',
  },
});

const stripStyles = StyleSheet.create({
  strip: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    maxHeight: 72,
  },
  stripContent: {
    padding: 8,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 6,
    minWidth: 180,
    maxWidth: 240,
    gap: 6,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconText: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  itemMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  removeBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '700',
  },
});
