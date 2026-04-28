import React, { useState, useCallback, memo } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StagedAttachment, StagingInput } from '../hooks/useAttachmentStaging';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore - expo-document-picker types may not resolve until full install
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme';

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
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
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
  placeholder = 'Напишите сообщение…',
}: MessageInputProps) {
  const theme = useTheme();
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
      'Прикрепить',
      undefined,
      [
        {
          text: 'Фото / видео',
          onPress: async () => {
            const files = await pickImages().catch(() => []);
            if (files.length > 0) onAttach(files);
          },
        },
        {
          text: 'Снять фото',
          onPress: async () => {
            const files = await takePhoto().catch(() => []);
            if (files.length > 0) onAttach(files);
          },
        },
        {
          text: 'Документ',
          onPress: async () => {
            const files = await pickDocuments().catch(() => []);
            if (files.length > 0) onAttach(files);
          },
        },
        { text: 'Отмена', style: 'cancel' },
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
          style={[stripStyles.strip, { backgroundColor: theme.colors.bgSecondary, borderTopColor: theme.colors.border }]}
          contentContainerStyle={stripStyles.stripContent}
        >
          {stagedFiles.map((s) => {
            const isImage = s.mimeType.startsWith('image/');
            return (
              <View key={s.localId} style={[stripStyles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {isImage ? (
                  <Image source={{ uri: s.uri }} style={stripStyles.thumb} />
                ) : (
                  <View style={[stripStyles.fileIcon, { backgroundColor: theme.colors.surfaceSoft }]}>
                    <Ionicons name="document-outline" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={stripStyles.itemInfo}>
                  <Text numberOfLines={1} style={[stripStyles.itemName, { color: theme.colors.textPrimary }]}>
                    {s.name}
                  </Text>
                  <Text style={[stripStyles.itemMeta, { color: theme.colors.textTertiary }]}>
                    {formatSize(s.sizeBytes)}
                    {s.status === 'uploading' && ` · ${s.progress}%`}
                    {s.status === 'error' && ` · ${s.error}`}
                  </Text>
                </View>
                <Pressable
                  style={[stripStyles.removeBtn, { backgroundColor: theme.colors.surfaceSoft }]}
                  onPress={() => onRemoveStaged?.(s.localId)}
                >
                  <Ionicons name="close" size={14} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
      <View style={[styles.container, { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border }]}>
        {onAttach && (
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.colors.surfaceSoft, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={openAttachMenu}
          >
            <Ionicons name="attach" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderColor: theme.colors.border,
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={4000}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceSoft,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Ionicons
            name="send"
            size={18}
            color={canSend ? theme.colors.onPrimary : theme.colors.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const stripStyles = StyleSheet.create({
  strip: { borderTopWidth: StyleSheet.hairlineWidth, maxHeight: 78 },
  stripContent: { padding: 10, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    minWidth: 200,
    maxWidth: 260,
    gap: 8,
  },
  thumb: { width: 42, height: 42, borderRadius: 10 },
  fileIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 12, fontWeight: '600' },
  itemMeta: { fontSize: 11 },
  removeBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
